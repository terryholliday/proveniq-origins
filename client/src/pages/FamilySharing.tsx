import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Mail,
  Link as LinkIcon,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Shield,
  Clock,
  Eye,
  BookOpen,
  AlertCircle,
} from 'lucide-react'
import { familyShareApi, chaptersApi, FamilyShare } from '@/lib/api'

export default function FamilySharing() {
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Form state
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [accessLevel, setAccessLevel] = useState<'read' | 'contribute'>('read')
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined)
  const [scopeAllChapters, setScopeAllChapters] = useState(true)
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])

  const { data: shares, isLoading } = useQuery({
    queryKey: ['familyShares'],
    queryFn: familyShareApi.getShares,
  })

  const { data: chapters } = useQuery({
    queryKey: ['chapters'],
    queryFn: chaptersApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: familyShareApi.createShare,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyShares'] })
      resetForm()
    },
  })

  const revokeMutation = useMutation({
    mutationFn: familyShareApi.revokeShare,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyShares'] })
    },
  })

  const regenerateMutation = useMutation({
    mutationFn: familyShareApi.regenerateToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyShares'] })
    },
  })

  const resetForm = () => {
    setRecipientEmail('')
    setRecipientName('')
    setAccessLevel('read')
    setExpiresInDays(undefined)
    setScopeAllChapters(true)
    setSelectedChapters([])
    setShowCreateForm(false)
  }

  const handleCreate = () => {
    createMutation.mutate({
      recipientEmail,
      recipientName: recipientName || undefined,
      accessLevel,
      expiresInDays,
      scopeAllChapters,
      scopeChapterIds: scopeAllChapters ? undefined : selectedChapters,
    })
  }

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString()
  }

  const toggleChapter = (id: string) => {
    setSelectedChapters(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Family Sharing</h1>
          <p className="text-muted-foreground">
            Share your memoir with family members via secure magic links
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          <Users className="mr-2 h-4 w-4" />
          Invite Family Member
        </Button>
      </div>

      {/* Create Share Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Create New Share
            </CardTitle>
            <CardDescription>
              Generate a magic link to share your memoir with a family member
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Recipient Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="family@example.com"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Recipient Name</Label>
                <Input
                  id="name"
                  placeholder="Mom, Dad, Sister..."
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Access Level</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={accessLevel === 'read'}
                      onChange={() => setAccessLevel('read')}
                    />
                    <Eye className="h-4 w-4" />
                    Read Only
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={accessLevel === 'contribute'}
                      onChange={() => setAccessLevel('contribute')}
                    />
                    <BookOpen className="h-4 w-4" />
                    Can Contribute
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires">Expires In (Days)</Label>
                <Input
                  id="expires"
                  type="number"
                  placeholder="Never expires"
                  value={expiresInDays || ''}
                  onChange={e => setExpiresInDays(e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="allChapters"
                  checked={scopeAllChapters}
                  onCheckedChange={checked => setScopeAllChapters(checked === true)}
                />
                <Label htmlFor="allChapters">Share all chapters</Label>
              </div>
            </div>

            {!scopeAllChapters && chapters && (
              <div className="space-y-2">
                <Label>Select Chapters to Share</Label>
                <div className="grid gap-2 max-h-48 overflow-y-auto border rounded p-3">
                  {chapters.map(ch => (
                    <label key={ch.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedChapters.includes(ch.id)}
                        onCheckedChange={() => toggleChapter(ch.id)}
                      />
                      Chapter {ch.number}: {ch.title}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleCreate}
                disabled={!recipientEmail || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Share Link'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>

            {createMutation.isError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                Failed to create share. Email may already have access.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Shares List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Shares</CardTitle>
          <CardDescription>
            {shares?.filter(s => s.isActive).length || 0} family members have access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading shares...</div>
          ) : shares?.filter(s => s.isActive).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No active shares yet</p>
              <p className="text-sm">Invite family members to view your memoir</p>
            </div>
          ) : (
            <div className="space-y-4">
              {shares?.filter(s => s.isActive).map((share: FamilyShare) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {share.recipientName || share.recipientEmail}
                      </span>
                      <Badge variant={share.accessLevel === 'contribute' ? 'default' : 'secondary'}>
                        {share.accessLevel}
                      </Badge>
                      {share.ledgerEventId && (
                        <Badge variant="outline" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Ledger
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4">
                      <span>{share.recipientEmail}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {share.expiresAt ? `Expires ${formatDate(share.expiresAt)}` : 'Never expires'}
                      </span>
                      {share.lastAccessedAt && (
                        <span>Last accessed: {formatDate(share.lastAccessedAt)}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {share.scopeAllChapters
                        ? 'All chapters'
                        : `${share.scopeChapterIds.length} chapters`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(share.shareUrl, share.id)}
                    >
                      {copied === share.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateMutation.mutate(share.id)}
                      disabled={regenerateMutation.isPending}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm('Revoke access for this family member?')) {
                          revokeMutation.mutate(share.id)
                        }
                      }}
                      disabled={revokeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-semibold">Secure & Auditable</h3>
              <p className="text-sm text-muted-foreground">
                All shares are recorded in the PROVENIQ Ledger for immutable provenance.
                Family members access your memoir via magic links - no account required.
                You can revoke access at any time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
