"use client";

import { useAuth } from "@/context/AuthContext";
import RequireAuth from "@/components/RequireAuth";
import PageHeader from "@/components/PageHeader";
import UsernameForm from "@/components/UsernameForm";
import Card, { CardHeader, CardBody } from "@/components/ui/Card";
import { RoleBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { SettingsIcon } from "@/components/ui/Icons";
import { shortHash } from "@/lib/format";

function AccountContent() {
    const { user, setLocalUsername } = useAuth();
    const toast = useToast();

    if (!user) return null;

    return (
        <div className="animate-fade-in">
            <PageHeader title="Account settings" description="Manage how you appear to your teammates." />

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="h-fit">
                    <CardHeader
                        icon={<SettingsIcon />}
                        title="Username"
                        description="Unique across Attest — this is how teammates add you to a team."
                    />
                    <CardBody>
                        <UsernameForm
                            currentUsername={user.username}
                            submitLabel={user.username ? "Save changes" : "Set username"}
                            submittingLabel="Saving…"
                            onSubmitted={(username) => {
                                setLocalUsername(username);
                                toast.success(`Your username is now @${username}.`);
                            }}
                        />
                    </CardBody>
                </Card>

                <Card className="h-fit">
                    <CardHeader title="Account details" />
                    <CardBody className="space-y-4">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Current username</p>
                            <p className="mt-0.5 text-sm text-ink-900">
                                {user.username ? `@${user.username}` : "Not set yet"}
                            </p>
                        </div>
                        {user.email && (
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Email</p>
                                <p className="mt-0.5 text-sm text-ink-900">{user.email}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Sui address</p>
                            <p className="mt-0.5 break-all font-mono text-xs text-ink-700" title={user.suiAddress}>
                                {shortHash(user.suiAddress, 12)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Global role</p>
                            <div className="mt-1"><RoleBadge role={user.role} /></div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}

export default function AccountPage() {
    return (
        <RequireAuth>
            <AccountContent />
        </RequireAuth>
    );
}
