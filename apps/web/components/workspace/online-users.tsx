"use client";

import { useEffect, useState } from "react";
import type { HocuspocusProvider } from "@script/editor";

interface OnlineUser {
  id: string;
  name: string;
  color: string;
}

export function OnlineUsers({ provider }: { provider: HocuspocusProvider | null }) {
  const [users, setUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!provider) return;

    const awareness = provider.awareness;
    if (!awareness) return;

    const updateUsers = () => {
      const states = awareness.getStates();
      const onlineUsers: OnlineUser[] = [];
      states.forEach((state) => {
        if (state.user) {
          onlineUsers.push(state.user as OnlineUser);
        }
      });
      setUsers(onlineUsers);
    };

    awareness.on("change", updateUsers);
    updateUsers();

    return () => {
      awareness.off("change", updateUsers);
    };
  }, [provider]);

  if (users.length <= 1) return null;

  return (
    <div className="flex items-center gap-1">
      {users.map((user) => (
        <div
          key={user.id || user.name}
          className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold text-white"
          style={{ backgroundColor: user.color }}
          title={user.name}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
      ))}
    </div>
  );
}
