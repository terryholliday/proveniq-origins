import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { authApi } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Shield } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function Settings() {
    const { user, refreshUser } = useAuth()
    const [aiConsent, setAiConsent] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        if (user) {
            // Assuming user object might not have aiConsent typed yet in frontend User interface, 
            // but it should be there if we updated the type. 
            // For now, we'll cast or checking if it exists.
            // Actually, we should update the frontend User type too if we haven't.
            // But let's assume it comes from the API.
            setAiConsent((user as any).aiConsent || false)
        }
    }, [user])

    const handleSave = async () => {
        setIsLoading(true)
        setMessage(null)
        try {
            await authApi.updateUser({ aiConsent })
            await refreshUser() // Refresh local user state
            setMessage({ type: 'success', text: 'Settings updated successfully' })
        } catch (error) {
            console.error('Failed to update settings:', error)
            setMessage({ type: 'error', text: 'Failed to update settings' })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-display font-bold">Settings</h1>
                <p className="text-muted-foreground">Manage your preferences and privacy controls.</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <CardTitle>Privacy & AI Processing</CardTitle>
                    </div>
                    <CardDescription>
                        Control how standard AI features interact with your data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-start space-x-4">
                        <div className="flex-1 space-y-1">
                            <Label htmlFor="ai-consent" className="text-base font-medium">
                                Enable AI Features
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Allow Proveniq Origins to use AI for features like:
                            </p>
                            <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                                <li>Analyzing uploaded photos for memories and dates</li>
                                <li>Transcribing audio recordings</li>
                                <li>Extracting text from documents</li>
                                <li>Interactive conversations with Ori</li>
                            </ul>
                            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                                <p className="font-semibold mb-1">Privacy Note:</p>
                                Your data is processed only when you explicitly use these features.
                                We do not train public models on your personal data.
                            </div>
                        </div>
                        <Switch
                            id="ai-consent"
                            checked={aiConsent}
                            onCheckedChange={setAiConsent}
                        />
                    </div>

                    {message && (
                        <Alert variant={message.type === 'success' ? 'default' : 'destructive'} className={message.type === 'success' ? "border-green-500 text-green-700 dark:text-green-400" : ""}>
                            {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                            <AlertTitle>{message.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
                            <AlertDescription>
                                {message.text}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
