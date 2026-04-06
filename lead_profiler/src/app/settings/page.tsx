'use client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft } from 'lucide-react'

export default function SettingsPage() {
    return (
        <div className="min-h-screen text-foreground p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <Button variant="ghost" className="mb-4 pl-0 hover:pl-2 transition-all" onClick={() => window.location.href = '/'}>
                    <ArrowLeft className="mr-2 size-4" />
                    Back to Dashboard
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account settings and preferences.</p>
            </div>

            <div className="grid gap-6">
                <Card className="glass-panel border-0 bg-white/5">
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Update your personal details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">First Name</label>
                                <Input defaultValue="Bharath" className="bg-black/20 border-white/10" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Last Name</label>
                                <Input defaultValue="V" className="bg-black/20 border-white/10" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input defaultValue="user@example.com" disabled className="bg-black/20 border-white/10 opacity-50" />
                        </div>
                        <div className="flex justify-end">
                            <Button>Save Changes</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-panel border-0 bg-white/5">
                    <CardHeader>
                        <CardTitle>Ideal Customer Profile (ICP)</CardTitle>
                        <CardDescription>Configure how AI scores your leads.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Target Industry</label>
                            <Input defaultValue="B2B SaaS, Technology" className="bg-black/20 border-white/10" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Company Size</label>
                            <Input defaultValue="$10M - $100M Revenue" className="bg-black/20 border-white/10" />
                        </div>
                        <div className="flex justify-end">
                            <Button>Update ICP</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
