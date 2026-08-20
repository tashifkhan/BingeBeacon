import { useStreaming } from "@/hooks/useStreaming";
import { AppImage as Image } from "@/components/app-image";
import { Loader } from "@/components/motion/loader";
import { PlayIcon } from "@/lib/icons";
import type { StreamingProvider } from "@/types";

interface StreamingProvidersProps {
  showId: string;
  region?: string;
}

export function StreamingProviders({
  showId,
  region = "IN",
}: StreamingProvidersProps) {
  const { data: streaming, isLoading } = useStreaming(showId, region);

  if (isLoading) {
    return (
      <div className="flex h-24 items-center justify-center rounded-xl border border-border/50 bg-card">
        <Loader variant="dots" size={20} label="Loading providers" />
      </div>
    );
  }

  if (!streaming || (!streaming.flatrate && !streaming.rent && !streaming.buy)) {
    return null;
  }

  const groups = [
    { label: "Stream", providers: streaming.flatrate },
    { label: "Rent", providers: streaming.rent },
    { label: "Buy", providers: streaming.buy },
  ].filter((g) => g.providers && g.providers.length > 0);

  return (
    <section className="rounded-xl border border-border/50 bg-card p-4">
      <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
        <PlayIcon weight="Filled" className="size-4 text-primary" />
        Where to watch
      </h3>

      <div className="space-y-5">
        {groups.map(({ label, providers }) => (
          <div key={label}>
            <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </h4>
            {/* Logos scroll sideways rather than wrapping into a tall block
                inside the phone layout. */}
            <ul className="rail gap-3 pb-1 no-scrollbar">
              {providers?.map((provider: StreamingProvider) => (
                <li
                  key={provider.provider_id}
                  className="flex w-16 flex-col items-center gap-1.5"
                >
                  <div className="relative size-12 overflow-hidden rounded-xl border border-border/50 bg-white shadow-sm">
                    <Image
                      src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <span className="line-clamp-2 text-center text-[10px] leading-tight text-muted-foreground">
                    {provider.provider_name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {streaming.link && (
          <a
            href={streaming.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-primary can-hover:hover:underline"
          >
            View all options on TMDB
          </a>
        )}
      </div>
    </section>
  );
}
