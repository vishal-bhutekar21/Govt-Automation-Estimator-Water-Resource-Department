import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Project } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { FolderKanban, Plus, MapPin, Building, Calendar, X } from 'lucide-react';

export const ProjectListView: React.FC = () => {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form State
  const [projectCode, setProjectCode] = useState('');
  const [projectName, setProjectName] = useState('');
  const [department, setDepartment] = useState('Water Resources Department');
  const [division, setDivision] = useState('Jigaon Project Division');
  const [subDivision, setSubDivision] = useState('Sub-Division No. 2');
  const [district, setDistrict] = useState('Buldhana');
  const [taluka, setTaluka] = useState('Nandura');
  const [description, setDescription] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ projects: Project[] }>('/v1/projects');
      setProjects(res.data.projects);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);

    try {
      await api.post('/v1/projects', {
        projectCode,
        projectName,
        department,
        division,
        subDivision,
        district,
        taluka,
        description,
      });
      setIsModalOpen(false);
      // Reset form
      setProjectCode('');
      setProjectName('');
      setDescription('');
      fetchProjects();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Government Irrigation & Acquisition Schemes
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Projects Registry
          </h1>
        </div>
        {isAdmin && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Create New Project
          </Button>
        )}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-2 py-12 text-center text-slate-400 text-sm animate-pulse">
            Loading government projects...
          </div>
        ) : projects.length ? (
          projects.map((p) => (
            <Card key={p.id} className="space-y-4 hover:border-gov-navy-300 transition-all">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gov-navy-50 text-gov-navy border border-gov-navy-200">
                      {p.projectCode}
                    </span>
                    <Badge variant="teal">Active</Badge>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{p.projectName}</h3>
                </div>
                <div className="p-2.5 rounded-gov-md bg-slate-100 text-slate-600">
                  <FolderKanban className="w-5 h-5" />
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {p.description || 'Government project for land and house valuation under submergence rehabilitation.'}
              </p>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Building className="w-3.5 h-3.5 text-gov-navy" />
                  <span className="truncate">{p.department}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-gov-teal" />
                  <span>{p.district}, {p.taluka}</span>
                </div>
              </div>

              <div className="p-3 rounded-gov-md bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Valuation Cases: </span>
                  <strong className="text-slate-800 font-bold">{p.casesCount ?? 0}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Total Value: </span>
                  <strong className="text-gov-navy font-bold font-mono">
                    {p.totalValuationSum ? `₹ ${p.totalValuationSum.toLocaleString('en-IN')}` : '₹ 0.00'}
                  </strong>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-2 py-12 text-center text-slate-400">
            No projects registered yet.
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-gov-lg max-w-lg w-full p-6 space-y-6 shadow-soft-lg border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Register New Government Project</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-gov-md bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">Project Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WRD-JIG-2026"
                    value={projectCode}
                    onChange={(e) => setProjectCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">Project Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jigaon Irrigation Scheme"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">Division</label>
                  <input
                    type="text"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">District</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">Taluka</label>
                  <input
                    type="text"
                    value={taluka}
                    onChange={(e) => setTaluka(e.target.value)}
                    className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">Description</label>
                <textarea
                  rows={2}
                  placeholder="Notes regarding project scope and submergence criteria..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-gov-md border border-slate-300 focus:ring-2 focus:ring-gov-navy outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                  Save Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
