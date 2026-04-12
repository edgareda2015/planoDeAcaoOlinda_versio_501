import { Menu, GraduationCap } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarContent } from "@/components/Sidebar";
import { NavLink } from "react-router-dom";

const Header = () => {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:hidden">
      <NavLink to="/" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
          <GraduationCap className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-sm font-bold">UNINASSAU</span>
      </NavLink>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default Header;