"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface User {
  id: string;
  name: string;
  email: string;
  status: "PENDING" | "ACTIVE" | "DISABLED";
  assignedExams: { examId: string; examCode: string; examName: string }[];
  progress: number;
  readinessScore: number;
  lastLoginAt: string | null;
  questionsAnswered: number;
}

interface Exam {
  id: string;
  code: string;
  name: string;
}

export default function ManagerUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/manager/users").then(r => r.json()),
      fetch("/api/manager/exams").then(r => r.json()),
    ])
      .then(([usersData, examsData]) => {
        setUsers(usersData.users || []);
        setExams(examsData.exams || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const refreshUsers = async () => {
    const res = await fetch("/api/manager/users");
    const data = await res.json();
    setUsers(data.users || []);
  };

  const handleAddUser = async () => {
    setFormError(null);
    setFormLoading(true);

    try {
      const res = await fetch("/api/manager/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          examIds: selectedExamIds,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setFormError(data.error || "Failed to create user");
        setFormLoading(false);
        return;
      }

      setInviteUrl(data.inviteUrl);
      setNewUserName("");
      setNewUserEmail("");
      setSelectedExamIds([]);
      refreshUsers();
    } catch {
      setFormError("Failed to create user");
    }
    setFormLoading(false);
  };

  const handleUserAction = async (userId: string, action: string) => {
    try {
      const res = await fetch("/api/manager/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });

      const data = await res.json();
      if (action === "resend-invite" && data.inviteUrl) {
        setInviteUrl(data.inviteUrl);
        setShowAddUser(true);
      }

      refreshUsers();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE": return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "PENDING": return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "DISABLED": return <Badge className="bg-gray-100 text-gray-800">Disabled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-gray-500">{users.length} total users</p>
        </div>
        <Button onClick={() => setShowAddUser(true)}>+ Add Student</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Exams</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(user.status)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.assignedExams.slice(0, 2).map((exam) => (
                      <Badge key={exam.examId} variant="outline" className="text-xs">
                        {exam.examCode}
                      </Badge>
                    ))}
                    {user.assignedExams.length > 2 && (
                      <Badge variant="outline" className="text-xs">+{user.assignedExams.length - 2}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={user.progress} className="w-16" />
                    <span className="text-sm">{user.progress}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-gray-500">{formatDate(user.lastLoginAt)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">⋮</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {user.status === "PENDING" && (
                        <DropdownMenuItem onClick={() => handleUserAction(user.id, "resend-invite")}>
                          Resend Invite
                        </DropdownMenuItem>
                      )}
                      {user.status === "ACTIVE" && (
                        <DropdownMenuItem onClick={() => handleUserAction(user.id, "disable")}>
                          Disable
                        </DropdownMenuItem>
                      )}
                      {user.status === "DISABLED" && (
                        <DropdownMenuItem onClick={() => handleUserAction(user.id, "enable")}>
                          Enable
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {formError && <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">{formError}</div>}
            {inviteUrl && (
              <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm">
                <p className="font-medium mb-2">Invite created!</p>
                <code className="bg-green-100 p-2 rounded block break-all text-xs">{inviteUrl}</code>
              </div>
            )}
            <div>
              <Label>Full Name</Label>
              <Input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="John Smith" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="john@company.com" />
            </div>
            <div>
              <Label>Assign Exams</Label>
              <div className="space-y-2 mt-2">
                {exams.map((exam) => (
                  <label key={exam.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedExamIds.includes(exam.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedExamIds([...selectedExamIds, exam.id]);
                        else setSelectedExamIds(selectedExamIds.filter(id => id !== exam.id));
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{exam.code} - {exam.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddUser(false); setInviteUrl(null); setFormError(null); }}>
              {inviteUrl ? "Done" : "Cancel"}
            </Button>
            {!inviteUrl && (
              <Button onClick={handleAddUser} disabled={formLoading || !newUserName || !newUserEmail}>
                {formLoading ? "Creating..." : "Create & Send Invite"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
