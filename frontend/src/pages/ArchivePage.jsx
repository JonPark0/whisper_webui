import { PageSplit } from '../components/layout/PageSplit';
import { JobList } from '../components/JobList';

// Not in Figma v2: the Transcribe screen's list pattern with Restore/Delete.
export default function ArchivePage() {
  return (
    <PageSplit
      title="Archive"
      description="Archived transcriptions and clean-ups. They are hidden from the queues; restore them any time. Deleting removes the transcript file for good."
    >
      <JobList title="Archived jobs" mode="archive" emptyText="Nothing archived yet." />
    </PageSplit>
  );
}
