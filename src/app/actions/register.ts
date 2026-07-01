'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth, getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getRegisterStatus() {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    // Find the currently open register
    const openRegister = await prisma.cashRegister.findFirst({
      where: { status: 'OPEN' },
      include: {
        openedBy: { select: { name: true } },
        movements: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (openRegister) {
      const startTime = openRegister.openedAt;

      // Calculate current expected cash
      // Expected = Opening Balance + (Cash Sales since startTime) - (Cash Expenses since startTime) + Additions - Removals
      
      const sales = await prisma.sale.aggregate({
        where: {
          paymentType: 'cash',
          createdAt: { gte: startTime }
        },
        _sum: { totalAmount: true }
      });
      
      const expenses = await prisma.expense.aggregate({
        where: {
          createdAt: { gte: startTime }
        },
        _sum: { amount: true }
      });

      const cashSales = sales._sum.totalAmount || 0;
      const cashExpenses = expenses._sum.amount || 0;
      
      const additions = openRegister.movements.filter(m => m.type === 'ADDITION').reduce((acc, m) => acc + m.amount, 0);
      const removals = openRegister.movements.filter(m => m.type === 'REMOVAL').reduce((acc, m) => acc + m.amount, 0);

      const currentExpectedCash = openRegister.openingBalance + cashSales + additions - cashExpenses - removals;

      return { 
        success: true, 
        data: { 
          isOpen: true, 
          register: openRegister,
          currentExpectedCash,
          cashSales,
          cashExpenses,
          additions,
          removals
        } 
      };
    }

    // If no open register, fetch the last closed one to show previous closing balance
    const lastClosedRegister = await prisma.cashRegister.findFirst({
      where: { status: 'CLOSED' },
      orderBy: { closedAt: 'desc' },
      include: {
        closedBy: { select: { name: true } }
      }
    });

    return {
      success: true,
      data: {
        isOpen: false,
        lastRegister: lastClosedRegister
      }
    };
  } catch (error: any) {
    console.error('getRegisterStatus error:', error);
    return { success: false, error: error.message || 'Failed to fetch register status' };
  }
}

export async function openRegister(data: { openingBalance: number, discrepancyAmount: number, discrepancyReason?: string, openingNotes?: string, openedAt?: string }) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    // Verify there isn't already an open register
    const existing = await prisma.cashRegister.findFirst({ where: { status: 'OPEN' } });
    if (existing) return { success: false, error: 'A register is already open.' };

    const newRegister = await prisma.cashRegister.create({
      data: {
        openingBalance: data.openingBalance,
        openedById: session.userId,
        status: 'OPEN',
        discrepancyAmount: data.discrepancyAmount,
        discrepancyReason: data.discrepancyReason || '',
        openingNotes: data.openingNotes || '',
        openedAt: data.openedAt ? new Date(data.openedAt) : new Date(),
      }
    });

    revalidatePath('/', 'layout');
    return { success: true, data: newRegister };
  } catch (error: any) {
    console.error('openRegister error:', error);
    return { success: false, error: error.message || 'Failed to open register' };
  }
}

export async function closeRegister(data: { actualClosingBalance: number, expectedClosingBalance: number, discrepancyAmount: number, discrepancyReason?: string, closingNotes?: string, closedAt?: string }) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const openRegister = await prisma.cashRegister.findFirst({ where: { status: 'OPEN' } });
    if (!openRegister) return { success: false, error: 'No open register found.' };

    const closedDate = data.closedAt ? new Date(data.closedAt) : new Date();

    const previousRegister = await prisma.cashRegister.findFirst({
      where: { status: 'CLOSED', closedAt: { lte: openRegister.openedAt } },
      orderBy: { closedAt: 'desc' }
    });
    const startTime = previousRegister?.closedAt || openRegister.openedAt;

    // Recalculate expected closing balance exactly up to `closedDate`
    const sales = await prisma.sale.aggregate({
      where: {
        paymentType: 'cash',
        createdAt: { gte: startTime, lte: closedDate }
      },
      _sum: { totalAmount: true }
    });
    
    const expenses = await prisma.expense.aggregate({
      where: {
        createdAt: { gte: startTime, lte: closedDate }
      },
      _sum: { amount: true }
    });

    const cashSales = sales._sum.totalAmount || 0;
    const cashExpenses = expenses._sum.amount || 0;
    
    const movements = await prisma.cashMovement.findMany({
      where: {
        registerId: openRegister.id,
        createdAt: { lte: closedDate }
      }
    });

    const additions = movements.filter(m => m.type === 'ADDITION').reduce((acc, m) => acc + m.amount, 0);
    const removals = movements.filter(m => m.type === 'REMOVAL').reduce((acc, m) => acc + m.amount, 0);

    const calculatedExpectedCash = openRegister.openingBalance + cashSales + additions - cashExpenses - removals;
    const finalDiscrepancy = data.actualClosingBalance - calculatedExpectedCash;

    const closed = await prisma.$transaction(async (tx) => {
      const closedReg = await tx.cashRegister.update({
        where: { id: openRegister.id },
        data: {
          closingBalance: data.actualClosingBalance,
          expectedClosingBalance: calculatedExpectedCash,
          discrepancyAmount: finalDiscrepancy,
          discrepancyReason: data.discrepancyReason || '',
          closingNotes: data.closingNotes || '',
          closedAt: closedDate,
          closedById: session.userId,
          status: 'CLOSED'
        }
      });

      // Now cascade the opening balance to all succeeding registers chronologically
      const subsequentRegisters = await tx.cashRegister.findMany({
        where: { openedAt: { gt: openRegister.openedAt } },
        orderBy: { openedAt: 'asc' }
      });

      if (subsequentRegisters.length > 0) {
        const firstNext = subsequentRegisters[0];
        const nextDiff = data.actualClosingBalance - firstNext.openingBalance;

        if (nextDiff !== 0) {
          let currentDiff = nextDiff;
          for (const reg of subsequentRegisters) {
            if (reg.status === 'CLOSED') {
              await tx.cashRegister.update({
                where: { id: reg.id },
                data: {
                  openingBalance: reg.openingBalance + currentDiff,
                  expectedClosingBalance: reg.expectedClosingBalance !== null 
                    ? reg.expectedClosingBalance + currentDiff 
                    : null,
                  closingBalance: reg.closingBalance !== null 
                    ? reg.closingBalance + currentDiff 
                    : null,
                }
              });
            } else {
              await tx.cashRegister.update({
                where: { id: reg.id },
                data: {
                  openingBalance: reg.openingBalance + currentDiff,
                }
              });
              break; // Stop at open register
            }
          }
        }
      }

      return closedReg;
    });

    if (finalDiscrepancy !== 0) {
      await prisma.notification.create({
        data: {
          type: 'DISCREPANCY',
          message: `ROJMEL Closed with discrepancy: ${finalDiscrepancy < 0 ? 'Missing' : 'Extra'} ${Math.abs(finalDiscrepancy)}. Reason: ${data.discrepancyReason}`,
          userId: session.userId,
        }
      });
    }

    revalidatePath('/', 'layout');
    return { success: true, data: closed };
  } catch (error: any) {
    console.error('closeRegister error:', error);
    return { success: false, error: error.message || 'Failed to close register' };
  }
}

export async function addCashMovement(data: { type: 'ADDITION' | 'REMOVAL', amount: number, reason: string, notes?: string }) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const openRegister = await prisma.cashRegister.findFirst({ where: { status: 'OPEN' } });
    if (!openRegister) return { success: false, error: 'No open register found.' };

    const movement = await prisma.cashMovement.create({
      data: {
        registerId: openRegister.id,
        userId: session.userId,
        type: data.type,
        amount: data.amount,
        reason: data.reason,
        notes: data.notes || '',
      }
    });

    revalidatePath('/', 'layout');
    return { success: true, data: movement };
  } catch (error: any) {
    console.error('addCashMovement error:', error);
    return { success: false, error: error.message || 'Failed to record cash movement' };
  }
}

export async function getRegisterHistory() {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const history = await prisma.cashRegister.findMany({
      where: { status: 'CLOSED' },
      orderBy: { closedAt: 'desc' },
      include: {
        openedBy: { select: { name: true } },
        closedBy: { select: { name: true } }
      }
    });

    return { success: true, data: history };
  } catch (error: any) {
    console.error('getRegisterHistory error:', error);
    return { success: false, error: error.message || 'Failed to fetch register history' };
  }
}

export async function deleteCashMovement(id: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only admins can delete cash movements' };
    }

    await prisma.cashMovement.delete({
      where: { id }
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    console.error('deleteCashMovement error:', error);
    return { success: false, error: 'Failed to delete cash movement' };
  }
}

export async function deleteCashRegister(id: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only admins can delete registers' };
    }

    // Delete associated movements first
    await prisma.cashMovement.deleteMany({
      where: { registerId: id }
    });

    // Delete register
    await prisma.cashRegister.delete({
      where: { id }
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    console.error('deleteCashRegister error:', error);
    return { success: false, error: 'Failed to delete register' };
  }
}

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

      // Now cascade the "Continuous Flow" to all subsequent registers chronologically
      const diff = newClosingBalance - (target.closingBalance || 0);

      if (diff !== 0) {
        const subsequentRegisters = await tx.cashRegister.findMany({
          where: { openedAt: { gt: target.openedAt } },
          orderBy: { openedAt: 'asc' }
        });

        for (const reg of subsequentRegisters) {
          if (reg.status === 'CLOSED') {
            await tx.cashRegister.update({
              where: { id: reg.id },
              data: {
                openingBalance: reg.openingBalance + diff,
                expectedClosingBalance: reg.expectedClosingBalance !== null 
                  ? reg.expectedClosingBalance + diff 
                  : null,
                closingBalance: reg.closingBalance !== null 
                  ? reg.closingBalance + diff 
                  : null,
              }
            });
          } else {
            await tx.cashRegister.update({
              where: { id: reg.id },
              data: {
                openingBalance: reg.openingBalance + diff,
              }
            });
            break; // Stop cascading once we reach today's open register
          }
        }
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

    const startTime = register.openedAt;

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

export async function reopenLastRegisterAction(pinCode: string) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const expectedPin = process.env.EMERGENCY_REOPEN_PIN || '1234';
    if (pinCode !== expectedPin) {
      return { success: false, error: 'Incorrect 4-digit security PIN' };
    }

    // Check if there is already an open register
    const openReg = await prisma.cashRegister.findFirst({
      where: { status: 'OPEN' }
    });
    if (openReg) {
      return { success: false, error: 'Cannot reopen: another drawer is currently open.' };
    }

    // Find the last closed register
    const lastClosed = await prisma.cashRegister.findFirst({
      where: { status: 'CLOSED' },
      orderBy: { closedAt: 'desc' }
    });

    if (!lastClosed) {
      return { success: false, error: 'No closed register found to reopen.' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Reopen the register in database
      const reopened = await tx.cashRegister.update({
        where: { id: lastClosed.id },
        data: {
          status: 'OPEN',
          closedAt: null,
          closingBalance: null,
          expectedClosingBalance: null,
          discrepancyAmount: 0,
          discrepancyReason: "",
          closedById: null
        }
      });
      return reopened;
    });

    revalidatePath('/', 'layout');
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('reopenLastRegisterAction error:', error);
    return { success: false, error: error.message || 'Failed to reopen register' };
  }
}
