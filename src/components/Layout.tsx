import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="container-responsive">
      <main>
        <Outlet />
      </main>
    </div>
  );
}
