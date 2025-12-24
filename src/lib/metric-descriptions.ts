/**
 * Metric descriptions for NFL player statistics
 * Provides detailed explanations for each stat type used in the application
 */

/**
 * Interface for metric description
 */
export interface MetricDescription {
    /** Short display name */
    name: string;
    /** Full description of what the metric measures */
    description: string;
    /** Why this metric matters for fantasy/betting */
    significance: string;
}

/**
 * Comprehensive descriptions for all NFL statistics
 * Used to populate tooltips throughout the application
 */
export const metricDescriptions: Record<string, MetricDescription> = {
    // Passing Stats (QB)
    passingYards: {
        name: "Passing Yards",
        description:
            "Total yards gained through completed passes. Calculated from the line of scrimmage to where the receiver is tackled or goes out of bounds.",
        significance:
            "Primary indicator of QB productivity. Elite QBs typically average 250+ yards per game.",
    },
    passingTDs: {
        name: "Passing Touchdowns",
        description:
            "Number of touchdown passes thrown. A passing TD is credited when a receiver catches the ball in the end zone or crosses the goal line with possession.",
        significance:
            "High-value fantasy stat. Top QBs throw 30+ TDs per season.",
    },
    interceptions: {
        name: "Interceptions",
        description:
            "Passes caught by a defender instead of the intended receiver. Results in a turnover and possession change.",
        significance:
            "Negative indicator of decision-making. Elite QBs keep INTs under 10 per season.",
    },
    completions: {
        name: "Completions",
        description:
            "Number of passes successfully caught by a receiver. A completion requires the receiver to maintain possession through the catch process.",
        significance:
            "Volume indicator. Higher completions often correlate with more yards and opportunities.",
    },
    attempts: {
        name: "Pass Attempts",
        description:
            "Total number of passes thrown, including completions, incompletions, and interceptions.",
        significance:
            "Shows passing volume and game script. High attempts may indicate trailing in games.",
    },

    // Rushing Stats (QB, RB, WR)
    rushingYards: {
        name: "Rushing Yards",
        description:
            "Total yards gained on running plays. Measured from the line of scrimmage to where the ball carrier is tackled or goes out of bounds.",
        significance:
            "Core RB stat. Elite backs rush for 1,000+ yards per season. For QBs, adds dual-threat value.",
    },
    rushingTDs: {
        name: "Rushing Touchdowns",
        description:
            "Touchdowns scored by carrying the ball across the goal line. High-value scoring plays typically from short yardage situations.",
        significance:
            "Premium fantasy points. Goal-line backs are especially valuable for this stat.",
    },
    carries: {
        name: "Carries",
        description:
            "Number of times a player runs with the ball from a handoff or direct snap. Also called rushing attempts.",
        significance:
            "Volume indicator for RBs. 15+ carries per game indicates a workhorse role.",
    },

    // Receiving Stats (RB, WR, TE)
    receivingYards: {
        name: "Receiving Yards",
        description:
            "Total yards gained after catching passes. Includes yards after catch (YAC) from the catch point to where tackled.",
        significance:
            "Primary WR/TE stat. Elite receivers gain 1,000+ yards per season.",
    },
    receivingTDs: {
        name: "Receiving Touchdowns",
        description:
            "Touchdowns scored by catching a pass in the end zone or carrying the ball across the goal line after a reception.",
        significance:
            "High-value fantasy stat. Red zone targets heavily influence this number.",
    },
    receptions: {
        name: "Receptions",
        description:
            "Number of passes successfully caught. In PPR (Points Per Reception) formats, each catch earns additional fantasy points.",
        significance:
            "Critical in PPR leagues. High-volume receivers provide consistent floor.",
    },
    targets: {
        name: "Targets",
        description:
            "Number of times a pass is thrown to a specific receiver. Includes completions, incompletions, and passes resulting in penalties.",
        significance:
            "Opportunity metric. High targets indicate trust from the QB and offensive involvement.",
    },
};

/**
 * Get the full tooltip content for a metric
 * @param key - The metric key (e.g., "passingYards")
 * @returns Formatted tooltip content or null if not found
 */
export function getMetricTooltip(key: string): MetricDescription | null {
    return metricDescriptions[key] || null;
}

/**
 * Get a short description for a metric (for compact tooltips)
 * @param key - The metric key
 * @returns Short description string
 */
export function getMetricShortDescription(key: string): string {
    const metric = metricDescriptions[key];
    return metric?.description || "";
}
