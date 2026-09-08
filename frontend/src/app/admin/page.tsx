// "use client";
//
// import { useState } from "react";
// import * as api from "@/lib/api";
// import { ApiError, Role, UserResponse } from "@/lib/api";
// import RequireAuth from "@/components/RequireAuth";
// import PageHeader from "@/components/PageHeader";
// import Card, { CardHeader, CardBody } from "@/components/ui/Card";
// import Button from "@/components/ui/Button";
// import Alert from "@/components/ui/Alert";
// import Badge from "@/components/ui/Badge";
// import { Input, Select } from "@/components/ui/Field";
// import { useToast } from "@/components/ui/Toast";
// import { SettingsIcon } from "@/components/ui/Icons";
//
// const GLOBAL_ROLES: { value: Role; label: string; blurb: string }[] = [
//   { value: "VIEWER", label: "Viewer", blurb: "The default for every new account." },
//   { value: "SIGNER", label: "Signer", blurb: "System-level signer capability." },
//   { value: "ADMIN", label: "Admin", blurb: "Can change anyone's global role, including yours." },
// ];
//
// function AdminContent() {
//   const toast = useToast();
//   const [userId, setUserId] = useState("");
//   const [role, setRole] = useState<Role>("SIGNER");
//   const [result, setResult] = useState<UserResponse | null>(null);
//   const [submitting, setSubmitting] = useState(false);
//
//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     setResult(null);
//     setSubmitting(true);
//     try {
//       const updated = await api.updateUserRole(Number(userId), role);
//       setResult(updated);
//       toast.success(`${updated.email} is now ${updated.role}.`);
//     } catch (err) {
//       toast.error(err instanceof ApiError ? err.message : "Could not update that role.");
//     } finally {
//       setSubmitting(false);
//     }
//   }
//
//   return (
//     <div className="animate-fade-in">
//       <PageHeader
//         title="Administration"
//         description="System-level role management. This is separate from team roles."
//         badge={<Badge tone="blue">Admin only</Badge>}
//       />
//
//       <div className="grid gap-6 lg:grid-cols-2">
//         <Card className="h-fit">
//           <CardHeader
//             icon={<SettingsIcon />}
//             title="Change a user's global role"
//             description="Ask the person for their user id — it is shown in their account menu."
//           />
//           <CardBody>
//             <form onSubmit={handleSubmit} className="space-y-4">
//               <Input
//                 label="User ID"
//                 type="number"
//                 min={1}
//                 required
//                 inputMode="numeric"
//                 placeholder="e.g. 4"
//                 value={userId}
//                 onChange={(e) => setUserId(e.target.value)}
//               />
//               <Select
//                 label="New global role"
//                 value={role}
//                 onChange={(e) => setRole(e.target.value as Role)}
//                 hint={GLOBAL_ROLES.find((r) => r.value === role)?.blurb}
//               >
//                 {GLOBAL_ROLES.map((r) => (
//                   <option key={r.value} value={r.value}>{r.label}</option>
//                 ))}
//               </Select>
//               <Button type="submit" fullWidth loading={submitting} disabled={!userId}>
//                 {submitting ? "Updating…" : "Update role"}
//               </Button>
//             </form>
//
//             {result && (
//               <Alert tone="success" className="mt-4" title="Role updated">
//                 {result.email} (user id {result.id}) is now {result.role}.
//               </Alert>
//             )}
//           </CardBody>
//         </Card>
//
//         <Card className="h-fit">
//           <CardHeader title="The two role systems" />
//           <CardBody className="space-y-4 text-xs leading-relaxed text-ink-600">
//             <div>
//               <p className="mb-1 text-sm font-medium text-ink-900">Global role</p>
//               <p>
//                 Lives in the JWT and describes the account at system level. Public registration
//                 always produces a Viewer — a registration request can never grant itself
//                 anything higher. This page is the only way a Signer or Admin is created, other
//                 than the bootstrap admin configured at server startup.
//               </p>
//             </div>
//             <div>
//               <p className="mb-1 text-sm font-medium text-ink-900">Team role</p>
//               <p>
//                 Scoped to one team and read live from the database on every request, never from
//                 the token — a person can belong to several teams, and a membership can change
//                 while a token is still valid. Team roles are managed from each team&apos;s own
//                 page, not here.
//               </p>
//             </div>
//             <Alert tone="info">
//               Promoting someone to Admin lets them change your role too. There is no undo beyond
//               setting the role back.
//             </Alert>
//           </CardBody>
//         </Card>
//       </div>
//     </div>
//   );
// }
//
// export default function AdminPage() {
//   return (
//     <RequireAuth role="ADMIN">
//       <AdminContent />
//     </RequireAuth>
//   );
// }
