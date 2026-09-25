export const navigation = [
  { id: 'overview', label: 'Overview', icon: '⌂' },
  { id: 'tasks', label: 'My tasks', icon: '☷' },
  { id: 'calendar', label: 'Calendar', icon: '□' },
  { id: 'events', label: 'Events', icon: '◇' },
  { id: 'insights', label: 'Insights', icon: '◒' },
];

export const taskSeed = [
  { id: 1, title: 'Finalize the Q2 launch plan', description: 'Polish the narrative, owners, and delivery milestones.', status: 'progress', priority: 'high', type: 'Deadline', due: '2026-09-10', startDate: '2026-09-06', deadline: '2026-09-10', deadlineTime: '17:00', tag: 'Strategy', icon: '✦', createdAt: '2026-09-06T08:30:00' },
  { id: 2, title: 'Review visual system', description: 'Give the new component explorations a final pass.', status: 'todo', priority: 'medium', type: 'Task', due: '2026-09-08', startDate: '2026-09-05', deadline: '2026-09-08', deadlineTime: '12:00', tag: 'Design', icon: '◌', createdAt: '2026-09-05T15:15:00' },
  { id: 3, title: 'Send partner follow-ups', description: 'Close the loop with the three launch partners.', status: 'todo', priority: 'low', type: 'Task', due: '2026-09-12', startDate: '2026-09-09', deadline: '2026-09-12', deadlineTime: '15:30', tag: 'People', icon: '↗', createdAt: '2026-09-04T11:45:00' },
  { id: 4, title: 'Publish release notes', description: 'Document the latest improvements for the team.', status: 'done', priority: 'medium', type: 'Deadline', due: '2026-09-04', startDate: '2026-09-03', deadline: '2026-09-04', deadlineTime: '17:00', tag: 'Writing', icon: '✓', createdAt: '2026-09-03T09:00:00' },
  { id: 5, title: 'Prepare Monday stand-up', description: 'Collect progress, blockers, and priorities.', status: 'done', priority: 'low', type: 'Meeting', due: '2026-09-01', startDate: '2026-09-01', deadline: '2026-09-01', deadlineTime: '09:00', tag: 'Team', icon: '⌁', createdAt: '2026-09-01T16:20:00' },
];

export const events = [
  { id: 1, title: 'Design critique', time: '10:30', date: '2026-09-06', type: 'Meeting', description: 'Review the latest visual system explorations.', color: 'coral' },
  { id: 2, title: 'Launch sync', time: '14:00', date: '2026-09-06', type: 'Important', description: 'Align on owners and the next launch milestone.', color: 'blue' },
  { id: 3, title: 'Product all-hands', time: '09:00', date: '2026-09-07', type: 'Meeting', description: 'Monthly product updates and team announcements.', color: 'green' },
  { id: 4, title: 'Release notes due', time: '17:00', date: '2026-09-10', type: 'Deadline', description: 'Publish the release notes for the latest improvements.', color: 'coral' },
];

export const dashboardCopy = {
  eyebrow: 'Sunday, September 6, 2026',
  title: 'A clear mind makes room for good work.',
  subtitle: 'You have a focused day ahead. Here is your work at a glance.',
};