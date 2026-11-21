import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { Spinner } from './components/ui';
import Home from './pages/Home';
import BrowseJobs from './pages/BrowseJobs';
import JobDetails from './pages/JobDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import ApplicationDetail from './components/ApplicationDetail';
import CandidateDashboard from './pages/candidate/Dashboard';
import CandidateProfile from './pages/candidate/Profile';
import MyApplications from './pages/candidate/MyApplications';
import Resumes from './pages/candidate/Resumes';
import RecruiterDashboard from './pages/recruiter/Dashboard';
import { CreateJob, EditJob } from './pages/recruiter/JobEditor';
import ManageJobs from './pages/recruiter/ManageJobs';
import Applicants from './pages/recruiter/Applicants';
import RecruiterProfile from './pages/recruiter/Profile';
import AdminDashboard from './pages/admin/Dashboard';
import ManageUsers from './pages/admin/Users';

export default function App() {
  return (
    <Suspense fallback={<Spinner className="min-h-screen" />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<BrowseJobs />} />
          <Route path="/jobs/:id" element={<JobDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register role="CANDIDATE" />} />
          <Route path="/register/recruiter" element={<Register role="RECRUITER" />} />
        </Route>

        <Route element={<ProtectedRoute roles={['CANDIDATE']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/candidate" element={<CandidateDashboard />} />
            <Route path="/candidate/profile" element={<CandidateProfile />} />
            <Route path="/candidate/applications" element={<MyApplications />} />
            <Route path="/candidate/applications/:id" element={<ApplicationDetail />} />
            <Route path="/candidate/resumes" element={<Resumes />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['RECRUITER']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/recruiter" element={<RecruiterDashboard />} />
            <Route path="/recruiter/jobs" element={<ManageJobs />} />
            <Route path="/recruiter/jobs/new" element={<CreateJob />} />
            <Route path="/recruiter/jobs/:id/edit" element={<EditJob />} />
            <Route path="/recruiter/applicants" element={<Applicants />} />
            <Route path="/recruiter/applicants/:id" element={<ApplicationDetail />} />
            <Route path="/recruiter/profile" element={<RecruiterProfile />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['ADMIN']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/jobs" element={<ManageJobs admin />} />
            <Route path="/admin/jobs/:id/edit" element={<EditJob admin />} />
            <Route path="/admin/applications" element={<Applicants admin />} />
            <Route path="/admin/applications/:id" element={<ApplicationDetail />} />
          </Route>
        </Route>

        <Route element={<PublicLayout />}><Route path="*" element={<NotFound />} /></Route>
      </Routes>
    </Suspense>
  );
}
