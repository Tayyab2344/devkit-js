"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useModal } from "@/lib/ModalContext";

interface Student {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  enrollments: {
    id: string;
    course: {
      name: string;
    };
  }[];
}

export default function AdminStudentsPage() {
  const { showAlert } = useModal();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{ email: string; password: string } | null>(null);

  const [newStudentForm, setNewStudentForm] = useState({
    name: "",
    email: "",
    password: "",
    courseId: "",
    batchId: "",
  });

  const fetchStudents = async () => {
    try {
      const res = await api.get("/users?role=student");
      setStudents(res.data);
    } catch (err) {
      console.error("Failed to load students list", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [coursesRes, batchesRes] = await Promise.all([
        api.get("/courses/all"),
        api.get("/batches"),
      ]);
      setCourses(coursesRes.data);
      setBatches(batchesRes.data);
    } catch (err) {
      console.error("Failed to load metadata", err);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchMetadata();
  }, []);

  const handleToggleStatus = async (id: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/users/${id}/toggle-active`);
      await fetchStudents();
    } catch {
      showAlert("Error", "Failed to toggle status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentForm.name || !newStudentForm.email || !newStudentForm.courseId) {
      showAlert("Error", "Please fill in all required fields (Name, Email, and Course).");
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post("/users/student", newStudentForm);
      setNewCredentials({
        email: res.data.user.email,
        password: res.data.password,
      });
      
      // Copy to clipboard
      navigator.clipboard.writeText(`Email: ${res.data.user.email}\nPassword: ${res.data.password}`).catch(() => {});
      
      setShowAddModal(false);
      setNewStudentForm({
        name: "",
        email: "",
        password: "",
        courseId: "",
        batchId: "",
      });
      await fetchStudents();
      showAlert("Success", "Student manually created and enrolled successfully!");
    } catch (err: any) {
      showAlert("Error", err.response?.data?.message || "Failed to create student.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredBatches = batches.filter(batch => {
    if (!newStudentForm.courseId) return true;
    return batch.courses?.some((c: any) => c.id === newStudentForm.courseId);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-green/30 border-t-brand-green rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Enrolled Students</h1>
          <p className="text-xs text-text-secondary mt-1">Manage active students and their courses</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-signup text-xs px-4 py-2">
          + Add Student
        </button>
      </div>

      {newCredentials && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start justify-between gap-4 animate-fade-in">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-green-600 font-bold">✓</div>
            <div>
              <h4 className="text-sm font-bold text-green-800">Student Account Created Successfully</h4>
              <p className="text-xs text-green-700 mt-1">Share these credentials with the student (already copied to clipboard):</p>
              <div className="mt-2 text-xs font-mono bg-white border border-green-200 rounded-lg p-2.5 space-y-1 text-text-primary select-all">
                <p><strong>Email:</strong> {newCredentials.email}</p>
                <p><strong>Password:</strong> {newCredentials.password}</p>
              </div>
            </div>
          </div>
          <button onClick={() => setNewCredentials(null)} className="text-green-500 hover:text-green-700 font-bold text-xs shrink-0">✕ Dismiss</button>
        </div>
      )}

      <div className="bg-white border border-border-light rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-light border-b border-border-light">
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase">Student Name</th>
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase">Email</th>
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase">Enrolled Courses</th>
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-text-secondary uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-bg-light transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-text-primary">{student.name}</td>
                  <td className="px-6 py-4 text-xs text-text-secondary">{student.email}</td>
                  <td className="px-6 py-4 text-xs text-text-primary">
                    {student.enrollments?.map((e) => e.course.name).join(", ") || "None"}
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      student.isActive ? "bg-green-50 text-green-600 border border-green-200" : "bg-gray-100 text-text-secondary"
                    }`}>
                      {student.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-right">
                    <button onClick={() => handleToggleStatus(student.id)} className="btn-signup text-[10px] px-3 py-1 bg-white border border-border-light text-text-primary hover:bg-bg-light">
                      Toggle Active
                    </button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-sm text-text-secondary">
                    No active students found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-border-light rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-5 border-b border-border-light pb-3">
              <h2 className="font-bold text-text-primary text-base">Add New Student</h2>
              <button onClick={() => setShowAddModal(false)} className="text-text-secondary hover:text-text-primary text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStudentForm.name}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                  className="w-full px-4 py-2 text-sm border border-border-light rounded-lg bg-white text-text-primary"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={newStudentForm.email}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                  className="w-full px-4 py-2 text-sm border border-border-light rounded-lg bg-white text-text-primary"
                  placeholder="e.g. student@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">Password (Optional)</label>
                <input
                  type="password"
                  value={newStudentForm.password}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, password: e.target.value })}
                  className="w-full px-4 py-2 text-sm border border-border-light rounded-lg bg-white text-text-primary"
                  placeholder="Leave blank to auto-generate"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">Select Course</label>
                <select
                  required
                  value={newStudentForm.courseId}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, courseId: e.target.value, batchId: "" })}
                  className="w-full px-4 py-2 text-sm border border-border-light rounded-lg bg-white text-text-primary"
                >
                  <option value="">-- Choose Course --</option>
                  {courses.filter(c => c.isActive).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">Assign Batch (Optional)</label>
                <select
                  value={newStudentForm.batchId}
                  onChange={(e) => setNewStudentForm({ ...newStudentForm, batchId: e.target.value })}
                  className="w-full px-4 py-2 text-sm border border-border-light rounded-lg bg-white text-text-primary"
                  disabled={!newStudentForm.courseId}
                >
                  <option value="">-- Choose Batch (or No Batch) --</option>
                  {filteredBatches.filter(b => b.isActive).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {!newStudentForm.courseId && (
                  <p className="text-[10px] text-text-secondary mt-1">Please select a course first to view compatible batches</p>
                )}
              </div>

              <div className="pt-2">
                <button type="submit" className="btn-signup w-full py-2.5 text-sm bg-brand-green text-white hover:bg-brand-green/90">
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {actionLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/25 backdrop-blur-[2px]">
          <div className="bg-white border border-border-light rounded-2xl p-6 flex flex-col items-center space-y-4 shadow-2xl">
            <div className="w-10 h-10 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
            <p className="text-xs font-bold text-text-primary uppercase tracking-wider">Processing Request...</p>
          </div>
        </div>
      )}
    </div>
  );
}
