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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  questionCount: number;
  flashcardCount: number;
}

export default function ManagerDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  // Form state for new user
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Fetch users and exams
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
      .catch(err => {
        console.error("Error fetching data:", err);
        setLoading(false);
      });
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

      // Show invite URL
      setInviteUrl(data.inviteUrl);
      
      // Reset form
      setNewUserName("");
      setNewUserEmail("");
      setSelectedExamIds([]);
      
      // Refresh user list
      refreshUsers();
    } catch (error) {
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
      }

      refreshUsers();
    } catch (error) {
      console.error("Error performing action:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "DISABLED":
        return <Badge className="bg-gray-100 text-gray-800">Disabled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getReadinessIndicator = (score: number) => {
    if (score >= 70) return "🟢";
    if (score >= 50) return "🟡";
    if (score > 0) return "🔴";
    return "⚪";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const activeUsers = users.filter(u => u.status === "ACTIVE");
  const pendingUsers = users.filter(u => u.status === "PENDING");
  const avgProgress = activeUsers.length > 0
    ? Math.round(activeUsers.reduce((sum, u) => sum + u.progress, 0) / activeUsers.length)
    : 0;
  const avgReadiness = activeUsers.length > 0
    ? Math.round(activeUsers.reduce((sum, u) => sum + u.readinessScore, 0) / activeUsers.length)
    : 0;

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your team's exam preparation</p>
        </div>
        <Button onClick={() => setShowAddUser(true)}>
          + Add Student
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{activeUsers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Avg Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgProgress}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Avg Readiness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgReadiness}%</div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({users.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeUsers.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingUsers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <UserTable 
            users={users} 
            getStatusBadge={getStatusBadge}
            getReadinessIndicator={getReadinessIndicator}
            formatDate={formatDate}
            onAction={handleUserAction}
            onSelect={(user) => {
              setSelectedUser(user);
              setShowUserDetail(true);
            }}
          />
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <UserTable 
            users={activeUsers} 
            getStatusBadge={getStatusBadge}
            getReadinessIndicator={getReadinessIndicator}
            formatDate={formatDate}
            onAction={handleUserAction}
            onSelect={(user) => {
              setSelectedUser(user);
              setShowUserDetail(true);
            }}
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <UserTable 
            users={pendingUsers} 
            getStatusBadge={getStatusBadge}
            getReadinessIndicator={getReadinessIndicator}
            formatDate={formatDate}
            onAction={handleUserAction}
            onSelect={(user) => {
              setSelectedUser(user);
              setShowUserDetail(true);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {formError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                {formError}
              </div>
            )}
            {inviteUrl && (
              <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm">
                <p className="font-medium mb-2">Invite created! Share this link:</p>
                <code className="bg-green-100 p-2 rounded block break-all">
                  {inviteUrl}
                </code>
              </div>
            )}
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="john@company.com"
              />
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
                        if (e.target.checked) {
                          setSelectedExamIds([...selectedExamIds, exam.id]);
                        } else {
                          setSelectedExamIds(selectedExamIds.filter(id => id !== exam.id));
                        }
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
            <Button variant="outline" onClick={() => {
              setShowAddUser(false);
              setInviteUrl(null);
              setFormError(null);
            }}>
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

      {/* User Detail Dialog */}
      <Dialog open={showUserDetail} onOpenChange={setShowUserDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedUser?.name}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Email</Label>
                  <p>{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <p>{getStatusBadge(selectedUser.status)}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Progress</Label>
                  <div className="flex items-center gap-2">
                    <Progress value={selectedUser.progress} className="flex-1" />
                    <span>{selectedUser.progress}%</span>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-500">Readiness Score</Label>
                  <p>{getReadinessIndicator(selectedUser.readinessScore)} {selectedUser.readinessScore}%</p>
                </div>
                <div>
                  <Label className="text-gray-500">Questions Answered</Label>
                  <p>{selectedUser.questionsAnswered}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Last Login</Label>
                  <p>{formatDate(selectedUser.lastLoginAt)}</p>
                </div>
              </div>
              <div>
                <Label className="text-gray-500">Assigned Exams</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedUser.assignedExams.map((exam) => (
                    <Badge key={exam.examId} variant="outline">
                      {exam.examCode}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDetail(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// User Table Component
function UserTable({ 
  users, 
  getStatusBadge, 
  getReadinessIndicator, 
  formatDate,
  onAction,
  onSelect,
}: {
  users: User[];
  getStatusBadge: (status: string) => React.ReactNode;
  getReadinessIndicator: (score: number) => string;
  formatDate: (date: string | null) => string;
  onAction: (userId: string, action: string) => void;
  onSelect: (user: User) => void;
}) {
  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          No users found
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Exams</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Readiness</TableHead>
            <TableHead>Last Active</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow 
              key={user.id} 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => onSelect(user)}
            >
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
                    <Badge variant="outline" className="text-xs">
                      +{user.assignedExams.length - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={user.progress} className="w-16" />
                  <span className="text-sm">{user.progress}%</span>
                </div>
              </TableCell>
              <TableCell>
                <span>{getReadinessIndicator(user.readinessScore)} {user.readinessScore}%</span>
              </TableCell>
              <TableCell className="text-gray-500">
                {formatDate(user.lastLoginAt)}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">⋮</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {user.status === "PENDING" && (
                      <DropdownMenuItem onClick={() => onAction(user.id, "resend-invite")}>
                        Resend Invite
                      </DropdownMenuItem>
                    )}
                    {user.status === "ACTIVE" && (
                      <DropdownMenuItem onClick={() => onAction(user.id, "disable")}>
                        Disable Account
                      </DropdownMenuItem>
                    )}
                    {user.status === "DISABLED" && (
                      <DropdownMenuItem onClick={() => onAction(user.id, "enable")}>
                        Enable Account
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
  );
}
