export enum PageType {
  HOME = 'home',
  PRICING = 'pricing',
  BLOG = 'blog',
  ABOUT = 'about',
  CONTACT = 'contact',
  PRODUCT = 'product',
  OTHER = 'other',
}

export class PageClassifier {
  private static readonly rules: { type: PageType; regex: RegExp }[] = [
    { type: PageType.PRICING, regex: /\/(pricing|plans|buy|subscribe)/i },
    { type: PageType.BLOG, regex: /\/(blog|news|articles|post)s?/i },
    { type: PageType.ABOUT, regex: /\/(about|company|our-story)/i },
    { type: PageType.CONTACT, regex: /\/(contact|contact-us|support|help)/i },
    { type: PageType.PRODUCT, regex: /\/(product|item|service|store|shop)s?/i },
    { type: PageType.HOME, regex: /^\/$/i },
  ];

  static classify(url: string): PageType {
    const urlPath = new URL(url).pathname;

    for (const rule of this.rules) {
      if (rule.regex.test(urlPath)) {
        return rule.type;
      }
    }

    return PageType.OTHER;
  }
} 