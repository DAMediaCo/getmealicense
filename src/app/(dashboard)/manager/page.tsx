"use client";

import { useState } from "react";
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
  assignedExams: string[];
  progress: number;
  readinessScore: number;
  lastActivity: string | null;
}

// Mock users
const mockUsers: User[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john.smith@company.com",
    status: "ACTIVE",
    assignedExams: ["FL-2-15", "FL-2-40"],
    progress: 72,
    readinessScore: 68,
    lastActivity: "2 hours ago",
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah.johnson@company.com",
    status: "ACTIVE",
    assignedExams: ["FL-2-15"],
    progress: 45,
    readinessScore: 52,
    lastActivity: "1 day ago",
  },
  {
    id: "3",
    name: "Mike Williams",
    email: "mike.williams@company.com",
    status: "PENDING",
    assignedExams: ["FL-2-15", "AZ-LH"],
    progress: 0,
    readinessScore: 0,
    lastActivity: null,
  },
  {
    id: "4",
    name: "Emily Davis",
    email: "emily.davis@company.com",
    status: "DISABLED",
    assignedExams: ["FL-2-40"],
    progress: 28,
    readinessScore: 35,
    lastActivity: "2 weeks ago",
  },
];

const examOptions = [
  { code: "FL-2-15", name: "Florida 2-15 (Life, Health, Annuities)" },
  { code: "FL-2-40", name: "Florida 2-40 (Health Only)" },
  { code: "AZ-LH", name: "Arizona Life and Health Producer" },
];

export default function ManagerDashboard() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    exams: [] as string[],
  });

  const activeUsers = users.filter(u => u.status === "ACTIVE");
  const pendingUsers = users.filter(u => u.status === "PENDING");
  const avgProgress = activeUsers.length > 0 
    ? Math.round(activeUsers.reduce((a, b) => a + b.progress, 0) / activeUsers.length)
    : 0;
  const avgReadiness = activeUsers.length > 0
    ? Math.round(activeUsers.reduce((a, b) => a + b.readinessScore, 0) / activeUsers.length)
    : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "DISABLED":
        return <Badge className="bg-gray-100 text-gray-800">Disabled</Badge>;
      default:
        return null;
    }
  };

  const getReadinessColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const handleAddUser = () => {
    // Mock adding user - will be API call
    const user: User = {
      id: Date.now().toString(),
      name: newUser.name,
      email: newUser.email,
      status: "PENDING",
      assignedExams: newUser.exams,
      progress: 0,
      readinessScore: 0,
      lastActivity: null,
    };
    setUsers([...users, user]);
    setNewUser({ name: "", email: "", exams: [] });
    setShowAddUser(false);
    // TODO: Send invite email
    alert(`Invite sent to ${user.email}`);
  };

  const toggleExam = (code: string) => {
    setNewUser(prev => ({
      ...prev,
      exams: prev.exams.includes(code)
        ? prev.exams.filter(e => e !== code)
        : [...prev.exams, code],
    }));
  };

  const handleResendInvite = (user: User) => {
    alert(`Invite resent to ${user.email}`);
  };

  const handleDisableUser = (user: User) => {
    setUsers(users.map(u => 
      u.id === user.id ? { ...u, status: "DISABLED" as const } : u
    ));
  };

  const handleEnableUser = (user: User) => {
    setUsers(users.map(u => 
      u.id === user.id ? { ...u, status: "ACTIVE" as const } : u
    ));
  };

  const viewUserDetail = (user: User) => {
    setSelectedUser(user);
    setShowUserDetail(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Manager Dashboard</h1>
          <p className="text-gray-500">Manage your team's training progress</p>
        </div>
        <Button onClick={() => setShowAddUser(true)}>
          + Add Employee
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{users.length}</div>
            <p className="text-gray-500 text-sm">Total Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-600">{activeUsers.length}</div>
            <p className="text-gray-500 text-sm">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{avgProgress}%</div>
            <p className="text-gray-500 text-sm">Avg Completion</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`text-3xl font-bold ${getReadinessColor(avgReadiness)}`}>
              {avgReadiness}%
            </div>
            <p className="text-gray-500 text-sm">Avg Readiness</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All ({users.length})</TabsTrigger>
              <TabsTrigger value="active">Active ({activeUsers.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingUsers.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <UserTable 
                users={users}
                getStatusBadge={getStatusBadge}
                getReadinessColor={getReadinessColor}
                viewUserDetail={viewUserDetail}
                handleResendInvite={handleResendInvite}
                handleDisableUser={handleDisableUser}
                handleEnableUser={handleEnableUser}
              />
            </TabsContent>
            
            <TabsContent value="active">
              <UserTable 
                users={activeUsers}
                getStatusBadge={getStatusBadge}
                getReadinessColor={getReadinessColor}
                viewUserDetail={viewUserDetail}
                handleResendInvite={handleResendInvite}
                handleDisableUser={handleDisableUser}
                handleEnableUser={handleEnableUser}
              />
            </TabsContent>
            
            <TabsContent value="pending">
              <UserTable 
                users={pendingUsers}
                getStatusBadge={getStatusBadge}
                getReadinessColor={getReadinessColor}
                viewUserDetail={viewUserDetail}
                handleResendInvite={handleResendInvite}
                handleDisableUser={handleDisableUser}
                handleEnableUser={handleEnableUser}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="john@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Assign Exams</Label>
              <div className="space-y-2">
                {examOptions.map(exam => (
                  <label
                    key={exam.code}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer ${
                      newUser.exams.includes(exam.code) 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={newUser.exams.includes(exam.code)}
                      onChange={() => toggleExam(exam.code)}
                      className="sr-only"
                    />
                    <div>
                      <div className="font-medium">{exam.code}</div>
                      <div className="text-sm text-gray-500">{exam.name}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddUser}
              disabled={!newUser.name || !newUser.email || newUser.exams.length === 0}
            >
              Send Invite
            </Button>
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
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(selectedUser.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Activity</p>
                  <p className="font-medium">{selectedUser.lastActivity || "Never"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Assigned Exams</p>
                  <div className="flex gap-1">
                    {selectedUser.assignedExams.map(e => (
                      <Badge key={e} variant="outline">{e}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Progress by Exam</h4>
                {selectedUser.assignedExams.map(examCode => (
                  <div key={examCode} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{examCode}</span>
                      <span>{selectedUser.progress}%</span>
                    </div>
                    <Progress value={selectedUser.progress} className="h-2" />
                  </div>
                ))}
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Topic Performance</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Life Insurance Basics</span>
                    <span className="text-green-600">85%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Policy Provisions</span>
                    <span className="text-yellow-600">62%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Annuities</span>
                    <span className="text-red-600">48%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Health Insurance</span>
                    <span className="text-yellow-600">71%</span>
                  </div>
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

// Separate component for the user table
function UserTable({
  users,
  getStatusBadge,
  getReadinessColor,
  viewUserDetail,
  handleResendInvite,
  handleDisableUser,
  handleEnableUser,
}: {
  users: User[];
  getStatusBadge: (status: string) => React.ReactNode;
  getReadinessColor: (score: number) => string;
  viewUserDetail: (user: User) => void;
  handleResendInvite: (user: User) => void;
  handleDisableUser: (user: User) => void;
  handleEnableUser: (user: User) => void;
}) {
  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No employees found
      </div>
    );
  }

  return (
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
        {users.map(user => (
          <TableRow key={user.id}>
            <TableCell>
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>
            </TableCell>
            <TableCell>{getStatusBadge(user.status)}</TableCell>
            <TableCell>
              <div className="flex gap-1 flex-wrap">
                {user.assignedExams.map(e => (
                  <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <div className="w-24">
                <div className="text-sm mb-1">{user.progress}%</div>
                <Progress value={user.progress} className="h-1.5" />
              </div>
            </TableCell>
            <TableCell>
              <span className={`font-medium ${getReadinessColor(user.readinessScore)}`}>
                {user.readinessScore}%
              </span>
            </TableCell>
            <TableCell className="text-sm text-gray-500">
              {user.lastActivity || "Never"}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">•••</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => viewUserDetail(user)}>
                    View Details
                  </DropdownMenuItem>
                  {user.status === "PENDING" && (
                    <DropdownMenuItem onClick={() => handleResendInvite(user)}>
                      Resend Invite
                    </DropdownMenuItem>
                  )}
                  {user.status === "ACTIVE" && (
                    <DropdownMenuItem 
                      onClick={() => handleDisableUser(user)}
                      className="text-red-600"
                    >
                      Disable Account
                    </DropdownMenuItem>
                  )}
                  {user.status === "DISABLED" && (
                    <DropdownMenuItem onClick={() => handleEnableUser(user)}>
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
  );
}
