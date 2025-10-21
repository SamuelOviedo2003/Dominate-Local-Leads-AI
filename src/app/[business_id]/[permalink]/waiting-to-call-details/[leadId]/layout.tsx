import OptimizedLayoutWrapper from '@/components/OptimizedLayoutWrapper'

interface WaitingToCallDetailsLayoutProps {
  children: React.ReactNode
  params: {
    business_id: string
    permalink: string
    leadId: string
  }
}

export default function WaitingToCallDetailsLayout({ children, params }: WaitingToCallDetailsLayoutProps) {
  return <OptimizedLayoutWrapper>{children}</OptimizedLayoutWrapper>
}
