"use client";

/**
 * PersonnelTableClient — thin client bridge between the server-rendered table
 * and the client-side drawer. Also handles the row action buttons.
 *
 * The entire PersonnelPage is the drawer host. We use a custom event to
 * communicate "open edit drawer" without prop drilling through Server Components.
 */

import { PersonnelRowActions } from "./PersonnelRowActions";

interface PersonnelTableClientProps {
  id:        string;
  fullName:  string;
  canEdit:   boolean;
  canDelete: boolean;
}

export function PersonnelTableClient({
  id,
  fullName,
  canEdit,
  canDelete,
}: PersonnelTableClientProps) {
  const handleEdit = (personnelId: string) => {
    // Dispatch custom event caught by PersonnelPageClient
    window.dispatchEvent(
      new CustomEvent("personnel:edit", { detail: { id: personnelId } })
    );
  };

  return (
    <PersonnelRowActions
      id={id}
      fullName={fullName}
      canEdit={canEdit}
      canDelete={canDelete}
      onEdit={handleEdit}
    />
  );
}