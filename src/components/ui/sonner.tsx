import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      richColors
      closeButton
      expand
      visibleToasts={4}
      gap={12}
      offset={24}
      duration={3800}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group toast pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border pl-4 pr-10 py-3.5 text-card-foreground shadow-[0_24px_60px_-16px_rgba(0,0,0,0.28),0_8px_20px_-8px_rgba(0,0,0,0.14)] backdrop-blur-xl backdrop-saturate-150 transition-all data-[swipe=move]:transition-none",
          title: "text-[13.5px] font-semibold leading-snug tracking-tight break-words",
          description: "text-[12px] leading-relaxed opacity-85 mt-0.5 break-words",
          actionButton:
            "group-[.toast]:rounded-lg group-[.toast]:bg-primary group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs group-[.toast]:font-semibold group-[.toast]:text-primary-foreground hover:group-[.toast]:opacity-90",
          cancelButton:
            "group-[.toast]:rounded-lg group-[.toast]:bg-muted group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:!absolute group-[.toast]:!left-auto group-[.toast]:!right-2.5 group-[.toast]:!top-2.5 group-[.toast]:!translate-x-0 group-[.toast]:!translate-y-0 group-[.toast]:!h-6 group-[.toast]:!w-6 group-[.toast]:!rounded-full group-[.toast]:!border-0 group-[.toast]:!bg-black/[0.06] dark:group-[.toast]:!bg-white/10 group-[.toast]:!text-current group-[.toast]:!opacity-70 hover:group-[.toast]:!opacity-100 hover:group-[.toast]:!bg-black/15 dark:hover:group-[.toast]:!bg-white/20 group-[.toast]:!shadow-none group-[.toast]:!inline-flex group-[.toast]:!items-center group-[.toast]:!justify-center group-[.toast]:!transition-all group-[.toast]:!duration-150 focus-visible:group-[.toast]:!ring-2 focus-visible:group-[.toast]:!ring-current/30 focus-visible:group-[.toast]:!opacity-100 [&>svg]:!h-3 [&>svg]:!w-3 [&>svg]:!stroke-[3] [&>svg]:!opacity-100",
          success:
            "group-[.toaster]:!border-emerald-500/40 group-[.toaster]:!bg-gradient-to-br group-[.toaster]:!from-emerald-50 group-[.toaster]:!to-emerald-100/70 group-[.toaster]:!text-emerald-900 dark:group-[.toaster]:!from-emerald-950/80 dark:group-[.toaster]:!to-emerald-900/40 dark:group-[.toaster]:!text-emerald-50 dark:group-[.toaster]:!border-emerald-400/30",
          error:
            "group-[.toaster]:!border-rose-500/40 group-[.toaster]:!bg-gradient-to-br group-[.toaster]:!from-rose-50 group-[.toaster]:!to-rose-100/70 group-[.toaster]:!text-rose-900 dark:group-[.toaster]:!from-rose-950/80 dark:group-[.toaster]:!to-rose-900/40 dark:group-[.toaster]:!text-rose-50 dark:group-[.toaster]:!border-rose-400/30",
          warning:
            "group-[.toaster]:!border-amber-500/40 group-[.toaster]:!bg-gradient-to-br group-[.toaster]:!from-amber-50 group-[.toaster]:!to-amber-100/70 group-[.toaster]:!text-amber-900 dark:group-[.toaster]:!from-amber-950/80 dark:group-[.toaster]:!to-amber-900/40 dark:group-[.toaster]:!text-amber-50 dark:group-[.toaster]:!border-amber-400/30",
          info:
            "group-[.toaster]:!border-sky-500/40 group-[.toaster]:!bg-gradient-to-br group-[.toaster]:!from-sky-50 group-[.toaster]:!to-sky-100/70 group-[.toaster]:!text-sky-900 dark:group-[.toaster]:!from-sky-950/80 dark:group-[.toaster]:!to-sky-900/40 dark:group-[.toaster]:!text-sky-50 dark:group-[.toaster]:!border-sky-400/30",
          icon: "shrink-0 mt-[3px] [&_svg]:!h-4 [&_svg]:!w-4",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
