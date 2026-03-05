"use client";

import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  betaApproved: boolean;
  createdAt: string;
  _count: { ownedProjects: number };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/admin/users${params}`);
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  async function toggleBeta(userId: string, betaApproved: boolean) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, betaApproved }),
    });
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, betaApproved } : u))
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Пользователи</h1>
        <span className="text-sm text-muted-foreground">{users.length} всего</span>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          className="admin-input pl-10"
          placeholder="Поиск по имени или email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="admin-card overflow-x-auto p-0">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Email</th>
              <th>Регистрация</th>
              <th>Проекты</th>
              <th>Бета-доступ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{u.name}</td>
                <td className="text-muted-foreground">{u.email}</td>
                <td className="text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString("ru")}
                </td>
                <td>{u._count.ownedProjects}</td>
                <td>
                  <button
                    onClick={() => toggleBeta(u.id, !u.betaApproved)}
                    className={`toggle ${u.betaApproved ? "active" : ""}`}
                  />
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted-foreground py-8">
                  Пользователи не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
