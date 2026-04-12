import { useState } from "react";
import { useActionChecklist, useAddChecklistItem, useUpdateChecklistItem, useDeleteChecklistItem } from "@/hooks/useActionChecklist";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionChecklistProps {
  actionId: string;
}

export const ActionChecklist = ({ actionId }: ActionChecklistProps) => {
  const { data: items, isLoading } = useActionChecklist(actionId);
  const { mutate: addItem, isPending: isAdding } = useAddChecklistItem();
  const { mutate: updateItem } = useUpdateChecklistItem();
  const { mutate: deleteItem } = useDeleteChecklistItem();
  const [newItem, setNewItem] = useState("");

  const handleAddItem = () => {
    if (newItem.trim()) {
      addItem({ actionId, description: newItem.trim() }, {
        onSuccess: () => setNewItem(""),
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Checklist de Sub-tarefas</h4>
      <div className="space-y-2">
        {items?.map(item => (
          <div key={item.id} className="flex items-center gap-2 group">
            <Checkbox
              id={`item-${item.id}`}
              checked={item.is_completed}
              onCheckedChange={(checked) => updateItem({ id: item.id, is_completed: !!checked, action_id: actionId })}
            />
            <label
              htmlFor={`item-${item.id}`}
              className={cn(
                "flex-grow text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                item.is_completed && "line-through text-muted-foreground"
              )}
            >
              {item.description}
            </label>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => deleteItem({ id: item.id, action_id: actionId })}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-2">
        <Input
          placeholder="Adicionar nova sub-tarefa..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
        />
        <Button onClick={handleAddItem} disabled={isAdding}>
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};