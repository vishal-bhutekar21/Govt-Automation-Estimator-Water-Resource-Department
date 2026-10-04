import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { CaseWizardView } from './CaseWizardView';
import { ValuationWorkspace } from '../valuation/ValuationWorkspace';

export const CaseEntry: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [workflow, setWorkflow] = useState<'LEGACY' | 'BUILDING' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get<{ case: { workflow?: 'LEGACY' | 'BUILDING' } }>(`/v1/cases/${id}`)
      .then((res) => setWorkflow(res.data.case.workflow === 'BUILDING' ? 'BUILDING' : 'LEGACY'))
      .catch(() => setError('This case could not be opened.'));
  }, [id]);

  if (error) return <div className="p-8 text-sm text-red-700">{error}</div>;
  if (!workflow) return <div className="p-8 text-sm text-slate-500">Opening the case…</div>;
  if (workflow === 'BUILDING') return <ValuationWorkspace />;
  return <CaseWizardView />;
};
