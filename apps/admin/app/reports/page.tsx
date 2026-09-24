import { getReportStats } from '../../lib/reports';
import ReportsDashboard from './reports-dashboard';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const stats = await getReportStats();
  return <ReportsDashboard stats={stats} />;
}
