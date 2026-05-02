import { useState } from "react";
import { useUsefulLinks, UsefulLink, useDeleteUsefulLink } from "@/hooks/useUsefulLinks";
import { useVersion } from "@/contexts/VersionContext";
import { LinkModal } from "@/components/LinkModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, XCircle, PlusCircle, ExternalLink, MoreVertical, Pencil, Trash2 } from "lucide-react";

const LinksUteis = () => {
  const { activeUnitId } = useVersion();
  const { data: links, isLoading, isError } = useUsefulLinks(activeUnitId);
  const { mutate: deleteLink, isPending: isDeleting } = useDeleteUsefulLink();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<UsefulLink | null>(null);
  const [linkToDelete, setLinkToDelete] = useState<UsefulLink | null>(null);

  const handleOpenCreateModal = () => {
    setEditingLink(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (link: UsefulLink) => {
    setEditingLink(link);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLink(null);
  };

  const handleDeleteConfirm = () => {
    if (linkToDelete) {
      deleteLink(linkToDelete.id, {
        onSuccess: () => setLinkToDelete(null),
      });
    }
  };

  return (
    <>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Links Úteis</h1>
            <p className="text-muted-foreground">Acesse sistemas e recursos importantes em um só lugar.</p>
          </div>
          <Button onClick={handleOpenCreateModal}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Link
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {isError && (
          <Card className="p-6 text-destructive flex items-center">
            <XCircle className="h-5 w-5 mr-2" />
            Erro ao carregar os links. Tente novamente mais tarde.
          </Card>
        )}

        {links && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {links.length === 0 ? (
              <p className="text-muted-foreground col-span-full text-center">Nenhum link cadastrado ainda.</p>
            ) : (
              links.map((link) => (
                <Card key={link.id} className="flex flex-col">
                  <CardHeader className="flex-row items-start justify-between">
                    <div className="space-y-1.5">
                      <CardTitle>{link.title}</CardTitle>
                      <CardDescription className="truncate">{link.url}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEditModal(link)}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLinkToDelete(link)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="flex-grow" />
                  <CardFooter>
                    <Button asChild className="w-full">
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Acessar
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <LinkModal isOpen={isModalOpen} onClose={handleCloseModal} link={editingLink} activeUnitId={activeUnitId} />

      <AlertDialog open={!!linkToDelete} onOpenChange={(open) => !open && setLinkToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o link para "{linkToDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LinksUteis;