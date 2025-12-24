import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Users, 
  Mail, 
  Link as LinkIcon, 
  Copy, 
  Check,
  MessageSquare,
  Plus,
  Send
} from 'lucide-react'

const API_BASE = 'http://localhost:3001/api'

interface FamilyMember {
  id: string
  name: string
  email: string
  status: 'invited' | 'active' | 'pending'
  contributionCount: number
}

interface PerspectiveRequest {
  id: string
  eventTitle: string
  eventId: string
  requestedFrom: string
  status: 'pending' | 'received'
  response?: string
}

export default function FamilyCollaboration() {
  const [activeTab, setActiveTab] = useState<'invite' | 'perspectives' | 'contributions'>('invite')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState('')
  const [perspectiveRequest, setPerspectiveRequest] = useState('')

  // Mock data - in production this would come from API
  const familyMembers: FamilyMember[] = [
    { id: '1', name: 'Mom', email: 'mom@example.com', status: 'active', contributionCount: 5 },
    { id: '2', name: 'Dad', email: 'dad@example.com', status: 'invited', contributionCount: 0 },
  ]

  const perspectiveRequests: PerspectiveRequest[] = [
    { 
      id: '1', 
      eventTitle: 'Summer at Grandma\'s House', 
      eventId: 'evt1',
      requestedFrom: 'Mom',
      status: 'received',
      response: 'I remember that summer so differently! You were always running around with the neighbor kids...'
    },
  ]

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/events`)
      return res.json()
    },
  })

  const shareLink = `${window.location.origin}/contribute/${crypto.randomUUID().slice(0, 8)}`

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sendInvite = () => {
    // In production, this would call an API to send email
    alert(`Invite would be sent to ${inviteEmail}`)
    setInviteEmail('')
    setInviteMessage('')
  }

  const requestPerspective = () => {
    // In production, this would create a perspective request
    alert(`Perspective request would be sent for event: ${selectedEvent}`)
    setSelectedEvent('')
    setPerspectiveRequest('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Family Collaboration</h1>
        <p className="text-muted-foreground">
          Invite family members to contribute their perspectives to your memoir
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { id: 'invite', label: 'Invite Family', icon: Mail },
          { id: 'perspectives', label: 'Perspectives', icon: MessageSquare },
          { id: 'contributions', label: 'Contributions', icon: Users },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invite Tab */}
      {activeTab === 'invite' && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invite by Email</CardTitle>
              <CardDescription>
                Send a personal invitation to a family member
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Email Address</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="family@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Personal Message (optional)</label>
                <Textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Hi! I'm working on preserving our family memories and would love your help..."
                  className="min-h-[100px]"
                />
              </div>
              <Button onClick={sendInvite} disabled={!inviteEmail}>
                <Send className="w-4 h-4 mr-2" />
                Send Invitation
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Share Link</CardTitle>
              <CardDescription>
                Anyone with this link can contribute to your memoir
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button variant="outline" onClick={copyShareLink}>
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with family members. They'll be able to add their own 
                memories and perspectives without needing an account.
              </p>
            </CardContent>
          </Card>

          {/* Invited Members */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Family Members</CardTitle>
            </CardHeader>
            <CardContent>
              {familyMembers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No family members invited yet
                </p>
              ) : (
                <div className="divide-y">
                  {familyMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {member.contributionCount} contributions
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          member.status === 'active' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {member.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Perspectives Tab */}
      {activeTab === 'perspectives' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request a Perspective</CardTitle>
              <CardDescription>
                Ask a family member to share their version of a memory
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Select an Event</label>
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                >
                  <option value="">Choose an event...</option>
                  {events?.map((event: { id: string; title: string }) => (
                    <option key={event.id} value={event.id}>{event.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Your Question</label>
                <Textarea
                  value={perspectiveRequest}
                  onChange={(e) => setPerspectiveRequest(e.target.value)}
                  placeholder="What do you remember about this? I'd love to hear your side of the story..."
                  className="min-h-[80px]"
                />
              </div>
              <Button onClick={requestPerspective} disabled={!selectedEvent}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Request Perspective
              </Button>
            </CardContent>
          </Card>

          {/* Received Perspectives */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Received Perspectives</CardTitle>
            </CardHeader>
            <CardContent>
              {perspectiveRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No perspectives received yet
                </p>
              ) : (
                <div className="space-y-4">
                  {perspectiveRequests.map(req => (
                    <div key={req.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{req.eventTitle}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          req.status === 'received'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        From: {req.requestedFrom}
                      </p>
                      {req.response && (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm">
                          "{req.response}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contributions Tab */}
      {activeTab === 'contributions' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Family Contributions</CardTitle>
            <CardDescription>
              Memories and perspectives added by family members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No contributions yet</p>
              <p className="text-sm mt-2">
                Invite family members to start collecting their memories
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setActiveTab('invite')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Invite Family
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4">
          <h4 className="font-medium mb-2">How Family Collaboration Works</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Invite:</strong> Send email invites or share a link with family</li>
            <li>• <strong>Contribute:</strong> Family members can add their own memories</li>
            <li>• <strong>Perspectives:</strong> Request their version of shared events</li>
            <li>• <strong>Merge:</strong> Combine multiple viewpoints into richer stories</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
