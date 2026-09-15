import OrganizationOpportunityForm from '../../components/organization/OrganizationOpportunityForm.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'

function OrganizationOpportunityEditPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Organization"
        title="Edit opportunity"
        description="Update a draft, pending, or rejected listing. Approved listings cannot be edited here."
      />
      <OrganizationOpportunityForm mode="edit" />
    </div>
  )
}

export default OrganizationOpportunityEditPage
