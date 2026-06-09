export async function updateSaleTime(saleId: string, newTimeStr: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only admins can reorder sales' };
    }

    const newTime = new Date(newTimeStr);

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id: saleId } });
      if (!sale) throw new Error('Sale not found');

      // Update the time
      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: { createdAt: newTime }
      });

      // Recalculate closed register if this sale's new or old time affects a CLOSED register
      // To be safe, we recalculate BOTH the register it WAS in and the register it MOVED to, if they are closed.
      if (sale.paymentType === 'cash') {
        const registersToUpdate = new Set<string>();

        // Find the register it WAS in
        const oldRegister = await tx.cashRegister.findFirst({
          where: { status: 'CLOSED', closedAt: { gte: sale.createdAt } },
          orderBy: { closedAt: 'asc' }
        });
        if (oldRegister) registersToUpdate.add(oldRegister.id);

        // Find the register it IS in now
        const newRegister = await tx.cashRegister.findFirst({
          where: { status: 'CLOSED', closedAt: { gte: newTime } },
          orderBy: { closedAt: 'asc' }
        });
        if (newRegister) registersToUpdate.add(newRegister.id);

        for (const regId of registersToUpdate) {
          const targetRegister = await tx.cashRegister.findUnique({ where: { id: regId } });
          if (!targetRegister || !targetRegister.closedAt) continue;

          const prevReg = await tx.cashRegister.findFirst({
            where: { status: 'CLOSED', closedAt: { lte: targetRegister.openedAt } },
            orderBy: { closedAt: 'desc' }
          });
          const startTime = prevReg?.closedAt || targetRegister.openedAt;

          const rSales = await tx.sale.aggregate({
            where: { paymentType: 'cash', createdAt: { gte: startTime, lte: targetRegister.closedAt } },
            _sum: { totalAmount: true }
          });
          const rExpenses = await tx.expense.aggregate({
            where: { createdAt: { gte: startTime, lte: targetRegister.closedAt } },
            _sum: { amount: true }
          });
          const moves = await tx.cashMovement.findMany({
            where: { registerId: targetRegister.id, createdAt: { lte: targetRegister.closedAt } }
          });
          
          const adds = moves.filter(m => m.type === 'ADDITION').reduce((a, b) => a + b.amount, 0);
          const rems = moves.filter(m => m.type === 'REMOVAL').reduce((a, b) => a + b.amount, 0);

          const expectedClosing = targetRegister.openingBalance + (rSales._sum.totalAmount || 0) + adds - (rExpenses._sum.amount || 0) - rems;
          const discrepancy = (targetRegister.closingBalance || 0) - expectedClosing;

          await tx.cashRegister.update({
            where: { id: targetRegister.id },
            data: { expectedClosingBalance: expectedClosing, discrepancyAmount: discrepancy }
          });
        }
      }

      return updatedSale;
    });

    revalidatePath('/', 'layout');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Update sale time error:', error);
    return { success: false, error: error.message || 'Failed to update sale time' };
  }
}
