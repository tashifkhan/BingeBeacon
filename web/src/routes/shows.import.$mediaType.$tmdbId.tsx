import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BroadcastIcon } from "@/lib/icons";
import { Loader } from "@/components/motion/loader";
import { useImportShow } from "@/hooks/use-shows";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/shows/import/$mediaType/$tmdbId")({
	component: ImportShowPage,
});

function ImportShowPage() {
	const params = Route.useParams();
	const navigate = useNavigate();
	const tmdbId = Number(params.tmdbId);
	const { data: show, isError, error } = useImportShow(params.mediaType, tmdbId);

	useEffect(() => {
		if (show?.id) {
			void navigate({ to: "/shows/$id", params: { id: show.id }, replace: true });
		}
	}, [navigate, show?.id]);

	if (isError) {
		return (
			<div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
				<BroadcastIcon className="mb-4 size-10 text-destructive" />
				<h1 className="font-display text-xl font-semibold">Could not tune this title</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					{error instanceof Error ? error.message : "The metadata provider did not respond."}
				</p>
				<Button asChild variant="outline" className="mt-6">
					<Link to="/shows/search">Back to search</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
			<div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 glow-amber">
				<Loader variant="comet" size={28} className="text-primary" />
			</div>
			<div className="text-center">
				<p className="font-display font-semibold">Tuning the beacon</p>
				<p className="mt-1 text-sm text-muted-foreground">Importing metadata into your catalog…</p>
			</div>
		</div>
	);
}
