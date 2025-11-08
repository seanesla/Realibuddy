/**
 * Domain lists for different source type filters
 * Used with Perplexity's search_domain_filter parameter (max 20 domains)
 */

export const SOURCE_DOMAINS = {
    // Authoritative sources: Wikipedia, government, educational institutions
    authoritative: [
        'wikipedia.org',
        'britannica.com',
        'nist.gov',
        'cdc.gov',
        'nasa.gov',
        'nih.gov',
        'fda.gov',
        'epa.gov',
        'stanford.edu',
        'mit.edu',
        'harvard.edu',
        'ox.ac.uk',
        'cambridge.org',
        'who.int',
        'un.org',
        'worldbank.org',
        'census.gov',
        'usgs.gov',
        'noaa.gov',
        'loc.gov'
    ],

    // News and media organizations
    news: [
        'reuters.com',
        'apnews.com',
        'bbc.com',
        'nytimes.com',
        'washingtonpost.com',
        'wsj.com',
        'theguardian.com',
        'ft.com',
        'bloomberg.com',
        'economist.com',
        'npr.org',
        'pbs.org',
        'cnbc.com',
        'axios.com',
        'propublica.org',
        'factcheck.org',
        'snopes.com',
        'politifact.com',
        'fullfact.org',
        'apnews.com'
    ],

    // Social media platforms
    social: [
        'reddit.com',
        'twitter.com',
        'x.com',
        'facebook.com',
        'instagram.com',
        'tiktok.com',
        'linkedin.com',
        'youtube.com',
        'medium.com',
        'quora.com',
        'tumblr.com',
        'pinterest.com',
        'snapchat.com',
        'threads.net',
        'mastodon.social',
        'bluesky.app',
        'discord.com',
        'telegram.org',
        'whatsapp.com',
        'wechat.com'
    ],

    // Academic and research sources
    academic: [
        'arxiv.org',
        'scholar.google.com',
        'jstor.org',
        'pubmed.ncbi.nlm.nih.gov',
        'nature.com',
        'science.org',
        'sciencedirect.com',
        'springer.com',
        'wiley.com',
        'tandfonline.com',
        'plos.org',
        'cell.com',
        'ieee.org',
        'acm.org',
        'researchgate.net',
        'academia.edu',
        'semanticscholar.org',
        'biorxiv.org',
        'medrxiv.org',
        'ssrn.com'
    ]
} as const;

export type SourceFilterType = keyof typeof SOURCE_DOMAINS | 'all';

/**
 * Get domain list for a given source filter type
 * Returns undefined for 'all' (no filter)
 */
export function getDomainsForFilter(filterType: SourceFilterType): string[] | undefined {
    if (filterType === 'all') {
        return undefined;
    }
    return SOURCE_DOMAINS[filterType];
}
