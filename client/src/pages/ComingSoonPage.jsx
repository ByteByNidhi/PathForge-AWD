import EmptyState from '../components/ui/EmptyState.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'

function ComingSoonPage({ title, description }) {
  return (
    <div>
      <PageHeader eyebrow="PathForge" title={title} description={description} />
      <EmptyState
        title="Not in this sprint"
        message="This area is part of PathForge and will be implemented next. No placeholder data is shown."
      />
    </div>
  )
}

export default ComingSoonPage
