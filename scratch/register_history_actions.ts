export async function editClosedRegister(registerId: string, newClosingBalance: number, newClosingNotes: string, newReason: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only admins can edit closed registers' };
    }

    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.cashRegister.findUnique({ where: { id: registerId } });
      if (!target || target.status !== 'CLOSED') {
        throw new Error('Register not found or not closed');
      }

      // Calculate new discrepancy for the target register
      const newDiscrepancy = newClosingBalance - (target.expectedClosingBalance || 0);

      // Update the target register
      const updatedTarget = await tx.cashRegister.update({
        where: { id: registerId },
        data: {
          closingBalance: newClosingBalance,
          closingNotes: newClosingNotes,
          discrepancyReason: newReason,
          discrepancyAmount: newDiscrepancy
        }
      });

      // Now cascade the "Continuous Flow" to the immediately next register
      const nextRegister = await tx.cashRegister.findFirst({
        where: { openedAt: { gte: target.closedAt! } },
        orderBy: { openedAt: 'asc' }
      });

      if (nextRegister) {
        // The difference in opening balance is the difference between the new and old closing balance
        const diff = newClosingBalance - (target.closingBalance || 0);
        
        // The new expected closing balance shifts by the exact same amount
        const newExpected = nextRegister.expectedClosingBalance !== null 
          ? nextRegister.expectedClosingBalance + diff 
          : null;

        // If nextRegister is already closed, recalculate its discrepancy
        let nextDiscrepancy = nextRegister.discrepancyAmount;
        if (nextRegister.status === 'CLOSED' && nextRegister.closingBalance !== null && newExpected !== null) {
          nextDiscrepancy = nextRegister.closingBalance - newExpected;
        }

        await tx.cashRegister.update({
          where: { id: nextRegister.id },
          data: {
            openingBalance: nextRegister.openingBalance + diff,
            expectedClosingBalance: newExpected,
            discrepancyAmount: nextDiscrepancy
          }
        });
      }

      return updatedTarget;
    });

    revalidatePath('/', 'layout');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('editClosedRegister error:', error);
    return { success: false, error: error.message || 'Failed to edit closed register' };
  }
}

export async function getRegisterDetails(registerId: string) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const register = await prisma.cashRegister.findUnique({
      where: { id: registerId },
      include: {
        openedBy: { select: { name: true } },
        closedBy: { select: { name: true } }
      }
    });

    if (!register || !register.closedAt) {
      return { success: false, error: 'Register details not available' };
    }

    // Determine the precise start time (same gapless logic)
    const prevReg = await prisma.cashRegister.findFirst({
      where: { status: 'CLOSED', closedAt: { lte: register.openedAt } },
      orderBy: { closedAt: 'desc' }
    });
    const startTime = prevReg?.closedAt || register.openedAt;

    // Fetch transactions
    const sales = await prisma.sale.findMany({
      where: { paymentType: 'cash', createdAt: { gte: startTime, lte: register.closedAt } },
      include: { item: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const expenses = await prisma.expense.findMany({
      where: { createdAt: { gte: startTime, lte: register.closedAt } },
      orderBy: { createdAt: 'desc' }
    });

    const movements = await prisma.cashMovement.findMany({
      where: { registerId: register.id, createdAt: { lte: register.closedAt } },
      orderBy: { createdAt: 'desc' }
    });

    return { 
      success: true, 
      data: {
        register,
        sales,
        expenses,
        movements
      } 
    };
  } catch (error: any) {
    console.error('getRegisterDetails error:', error);
    return { success: false, error: 'Failed to fetch register details' };
  }
}
