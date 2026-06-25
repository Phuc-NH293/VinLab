import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Activity, ArrowRight, LogOut, Sparkles } from 'lucide-react';

import { api, clearSession, getStoredUser } from './lib/api';

import { defaultTabForRole, isTabAllowed, navigation, pageMeta, tabFromPath, tabPaths } from './config/appConfig';

import { BrandMark, PageErrorBoundary } from './components';

import { WelcomeScreen } from './pages/WelcomeScreen';

import { LoginScreen, StudentFaceSetup } from './pages/auth';

import { CameraPermission, CheckIn, ForcedFaceCheckIn } from './pages/attendance';

import { StudentPortal, Students } from './pages/student';

import { SocraticWorkspace } from './pages/SocraticWorkspace';

import { AdminDashboard } from './pages/AdminDashboard';

import { InstructorDashboard, Sessions } from './pages/teacher';

export function App() {
  const storedUser = getStoredUser();
  const [currentUser, setCurrentUser] = useState(storedUser);
  const [tab, setTab] = useState(() => tabFromPath(storedUser?.role));
  const [checkingSession, setCheckingSession] = useState(Boolean(storedUser));
  const [studentFaceProfile, setStudentFaceProfile] = useState(null);
  const [checkingFaceProfile, setCheckingFaceProfile] = useState(storedUser?.role === 'student');
  const [cameraPermissionReady, setCameraPermissionReady] = useState(
    () => localStorage.getItem('vinlab-camera-permission') === 'granted',
  );

  const [viewingWelcome, setViewingWelcome] = useState(() => {
    return !storedUser && (window.location.pathname === '/welcome' || window.location.pathname === '/' || window.location.pathname === '');
  });

  const [requireFaceAttendance, setRequireFaceAttendance] = useState(false);
  const [activeSessionForForcedCheckin, setActiveSessionForForcedCheckin] = useState(null);
  const [checkingAttendance, setCheckingAttendance] = useState(false);

  const visibleNavigation = navigation.filter(item => item.roles.includes(currentUser?.role));
  const activeTab = isTabAllowed(tab, currentUser?.role) ? tab : defaultTabForRole(currentUser?.role);
  const meta = pageMeta[activeTab] || pageMeta.checkin;
  const PageIcon = meta.icon;

  useEffect(() => {
    if (!currentUser) {
      setCheckingSession(false);
      return;
    }
    api('/auth/me')
      .then(user => {
        setCurrentUser(user);
        setTab(current => isTabAllowed(current, user.role) ? current : defaultTabForRole(user.role));
      })
      .catch(() => {
        clearSession();
        setCurrentUser(null);
      })
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (!currentUser) {
        const isWelcome = window.location.pathname === '/welcome' || window.location.pathname === '/' || window.location.pathname === '';
        setViewingWelcome(isWelcome);
      } else {
        setTab(tabFromPath(currentUser?.role));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  useEffect(() => {
    function handleExpiredSession() {
      setCurrentUser(null);
      setViewingWelcome(true);
      setTab('checkin');
      window.history.replaceState({}, '', '/welcome');
    }
    window.addEventListener('vinlab-auth-expired', handleExpiredSession);
    return () => window.removeEventListener('vinlab-auth-expired', handleExpiredSession);
  }, []);

  useEffect(() => {
    if (currentUser?.role !== 'student') {
      setStudentFaceProfile(null);
      setCheckingFaceProfile(false);
      return;
    }
    let active = true;
    setCheckingFaceProfile(true);
    api('/student/face-profile')
      .then(profile => {
        if (active) setStudentFaceProfile(profile);
      })
      .catch(() => {
        if (active) setStudentFaceProfile({ enrolled: false, sample_count: 0 });
      })
      .finally(() => {
        if (active) setCheckingFaceProfile(false);
      });
    return () => {
      active = false;
    };
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (currentUser?.role !== 'student' || !studentFaceProfile?.enrolled) {
      setRequireFaceAttendance(false);
      setActiveSessionForForcedCheckin(null);
      setCheckingAttendance(false);
      return;
    }

    let active = true;
    setCheckingAttendance(true);

    async function verifyCheckIn() {
      try {
        const schedule = await api('/student/schedule');
        const now = Date.now();
        const activeSessions = schedule.filter(s => {
          const startsAt = new Date(s.start_time).getTime();
          const endsAt = new Date(s.end_time).getTime();
          return s.status === 'active' && startsAt <= now && now <= endsAt;
        });

        if (activeSessions.length === 0) {
          if (active) {
            setRequireFaceAttendance(false);
            setActiveSessionForForcedCheckin(null);
            setCheckingAttendance(false);
          }
          return;
        }

        const activeSession = activeSessions[0];

        const history = await api('/student/attendance-history');
        const hasCheckedIn = history.some(
          att => att.session_id === activeSession.id &&
          (att.status === 'present' || att.status === 'pending_review' || att.status === 'excused')
        );

        if (active) {
          if (hasCheckedIn) {
            setRequireFaceAttendance(false);
            setActiveSessionForForcedCheckin(null);
          } else {
            setRequireFaceAttendance(true);
            setActiveSessionForForcedCheckin(activeSession);
          }
        }
      } catch (error) {
        console.error('Error verifying attendance:', error);
      } finally {
        if (active) setCheckingAttendance(false);
      }
    }

    verifyCheckIn();

    return () => {
      active = false;
    };
  }, [currentUser?.id, studentFaceProfile?.enrolled]);

  function handleLogout() {
    clearSession();
    setCurrentUser(null);
    setViewingWelcome(true);
    setTab('checkin');
    window.history.replaceState({}, '', '/welcome');
  }

  function openTab(nextTab) {
    if (!isTabAllowed(nextTab, currentUser?.role)) return;
    setTab(nextTab);
    window.history.pushState({}, '', tabPaths[nextTab]);
  }

  if (checkingSession) {
    return <div className="auth-loading"><Activity size={28} /><p>Đang kiểm tra phiên đăng nhập...</p></div>;
  }

  if (!currentUser) {
    if (viewingWelcome) {
      return (
        <WelcomeScreen
          onGoToLogin={() => {
            setViewingWelcome(false);
            window.history.pushState({}, '', '/login');
          }}
        />
      );
    }
    return (
      <LoginScreen
        onLogin={user => {
          setCurrentUser(user);
          const nextTab = defaultTabForRole(user.role);
          setTab(nextTab);
          window.history.replaceState({}, '', tabPaths[nextTab]);
        }}
        onGoToWelcome={() => {
          setViewingWelcome(true);
          window.history.pushState({}, '', '/welcome');
        }}
      />
    );
  }

  if (currentUser.role === 'student' && (checkingFaceProfile || !studentFaceProfile || checkingAttendance)) {
    return <div className="auth-loading"><Activity size={28} /><p>Đang kiểm tra thông tin sinh viên & điểm danh...</p></div>;
  }

  if (currentUser.role === 'student' && !studentFaceProfile.enrolled) {
    return (
      <StudentFaceSetup
        currentUser={currentUser}
        profile={studentFaceProfile}
        onLogout={handleLogout}
        onComplete={async () => {
          const profile = await api('/student/face-profile');
          setStudentFaceProfile(profile);
          setTab('checkin');
          window.history.replaceState({}, '', tabPaths.checkin);
        }}
      />
    );
  }

  if (currentUser.role === 'student' && requireFaceAttendance) {
    return (
      <ForcedFaceCheckIn
        currentUser={currentUser}
        session={activeSessionForForcedCheckin}
        onLogout={handleLogout}
        onComplete={() => {
          setRequireFaceAttendance(false);
          setActiveSessionForForcedCheckin(null);
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">VINLAB</h1>
                <span className="brand-pill">AI</span>
              </div>
              <p className="text-xs font-medium text-slate-500">Nền tảng điểm danh thông minh</p>
            </div>
          </div>
          <div className="status-pill">
            <span className="status-dot" />
            <span className="hidden sm:inline">{currentUser.full_name}</span>
            <span className="sm:hidden">{currentUser.role === 'teacher' ? 'GV' : currentUser.role === 'admin' ? 'AD' : 'SV'}</span>
          </div>
          <button type="button" className="logout-button" onClick={handleLogout} title="Đăng xuất">
            <LogOut size={18} /><span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-48 pt-6 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-8 lg:pb-10">
        <aside className="hidden lg:block">
          <div className="sidebar-card">
            <p className="mb-3 px-3 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
              Không gian làm việc
            </p>
            <nav className="space-y-2">
              {visibleNavigation.map(({ id, label, description, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => openTab(id)}
                  className={`nav-item ${activeTab === id ? 'nav-item-active' : ''}`}
                >
                  <span className="nav-icon"><Icon size={20} strokeWidth={2.3} /></span>
                  <span className="min-w-0 text-left">
                    <span className="block font-bold">{label}</span>
                    <span className={`block text-xs ${activeTab === id ? 'text-white/70' : 'text-slate-400'}`}>
                      {description}
                    </span>
                  </span>
                  <ArrowRight className="ml-auto opacity-60" size={16} />
                </button>
              ))}
            </nav>

            <div className="sidebar-highlight">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
                <Sparkles size={20} />
              </div>
              <p className="font-extrabold">Tương lai của lớp học</p>
              <p className="mt-1 text-xs leading-relaxed text-white/75">
                Nhanh hơn, thông minh hơn và hoàn toàn không giấy tờ.
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <section className="hero-panel">
            <div className="relative z-10 max-w-2xl">
              <div className="eyebrow"><PageIcon size={15} />{meta.eyebrow}</div>
              <h2>{meta.title}</h2>
              <p>{meta.description}</p>
            </div>
            <div className="hero-orbit hero-orbit-one" />
            <div className="hero-orbit hero-orbit-two" />
            <Sparkles className="hero-sparkle" size={30} />
          </section>

          <div className="page-content-stage mt-6">
            <PageErrorBoundary key={`${currentUser.role}:${activeTab}`}>
              {currentUser.role === 'student' && activeTab === 'checkin' && (
                cameraPermissionReady
                  ? <CheckIn currentUser={currentUser} />
                  : <CameraPermission onGranted={() => setCameraPermissionReady(true)} />
              )}
              {currentUser.role === 'teacher' && activeTab === 'sessions' && <Sessions />}
              {currentUser.role === 'teacher' && activeTab === 'students' && <Students />}
              {currentUser.role === 'teacher' && activeTab === 'instructor' && <InstructorDashboard />}
              {currentUser.role === 'student' && activeTab === 'studentPortal' && <StudentPortal />}
              {currentUser.role === 'student' && activeTab === 'socraticDashboard' && <SocraticWorkspace />}
              {currentUser.role === 'admin' && activeTab === 'admin' && <AdminDashboard />}
            </PageErrorBoundary>
            <div className="mobile-content-spacer lg:hidden" aria-hidden="true" />
          </div>
        </main>
      </div>

      <nav
        className="mobile-nav lg:hidden"
        style={{ gridTemplateColumns: `repeat(${visibleNavigation.length}, minmax(0, 1fr))` }}
      >
        {visibleNavigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => openTab(id)}
            className={`mobile-nav-item ${activeTab === id ? 'mobile-nav-active' : ''}`}
          >
            <Icon size={21} strokeWidth={2.4} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
