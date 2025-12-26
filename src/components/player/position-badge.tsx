import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { getPositionColor } from "@/lib/team-colors";
import { PlayerPosition } from "@/lib/types";

export function PositionBadge({
    playerPosition,
}: {
    playerPosition: PlayerPosition;
}) {
    const positionColor = getPositionColor(playerPosition);
    return (
        <Badge
            variant="secondary"
            className={cn("text-xs font-semibold", positionColor)}
        >
            {playerPosition}
        </Badge>
    );
}
