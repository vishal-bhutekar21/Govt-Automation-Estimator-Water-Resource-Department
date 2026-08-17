import { Response } from 'express';
import { db } from '../database/db';
import { AuthRequest } from '../middleware/auth';
import { DecimalMath } from '../utils/decimal';

export const getDashboardStats = (_req: AuthRequest, res: Response): void => {
  try {
    const totalProjects = db.projects.length;
    const totalCases = db.cases.length;
    const draftCases = db.cases.filter((c) => c.status === 'DRAFT' || c.status.includes('PROGRESS')).length;
    const completedCases = db.cases.filter((c) => c.status === 'APPROVED' || c.status === 'COMPLETED').length;

    // Calculate total valuation sum from final valuations
    let totalEstimatedValue = 0;
    db.finalValuations.forEach((fv) => {
      totalEstimatedValue = DecimalMath.add(totalEstimatedValue, fv.finalValuationAmount).toNumber();
    });

    // Recent cases with joined property and final valuation
    const recentCases = db.cases.slice(-5).reverse().map((c) => {
      const property = db.properties.find((p) => p.caseId === c.id);
      const project = db.projects.find((p) => p.id === c.projectId);
      const finalValuation = db.finalValuations.find((fv) => fv.caseId === c.id);

      return {
        id: c.id,
        caseNumber: c.caseNumber,
        projectName: project ? project.projectName : 'Unknown Project',
        ownerName: property ? property.ownerName : 'Not Assigned',
        houseNumber: property ? property.houseNumber : '-',
        village: property ? property.village : '-',
        status: c.status,
        valuationAmount: finalValuation ? finalValuation.finalValuationAmount : 0,
        formattedValuation: finalValuation ? DecimalMath.formatINR(finalValuation.finalValuationAmount) : 'Pending',
        valuationDate: c.valuationDate,
        createdAt: c.createdAt,
      };
    });

    res.status(200).json({
      stats: {
        totalProjects,
        totalCases,
        draftCases,
        completedCases,
        totalEstimatedValue,
        formattedTotalEstimatedValue: DecimalMath.formatINR(totalEstimatedValue),
      },
      recentCases,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: err.message || 'Failed to retrieve dashboard statistics',
    });
  }
};
