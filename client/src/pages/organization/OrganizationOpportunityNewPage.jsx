import OrganizationOpportunityForm from '../../components/organization/OrganizationOpportunityForm.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'

function OrganizationOpportunityNewPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Organization"
        title="Create opportunity"
        description="Save as a draft or submit for admin review. Students only see approved listings."
      />
      <OrganizationOpportunityForm mode="create" />
    </div>
  )
}

export default OrganizationOpportunityNewPage
