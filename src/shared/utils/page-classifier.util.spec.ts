import { PageClassifier, PageType } from './page-classifier.util';

describe('PageClassifier', () => {
  it('should classify home page', () => {
    expect(PageClassifier.classify('http://example.com/')).toBe(PageType.HOME);
  });

  it('should classify pricing page', () => {
    expect(PageClassifier.classify('http://example.com/pricing')).toBe(PageType.PRICING);
    expect(PageClassifier.classify('http://example.com/plans')).toBe(PageType.PRICING);
    expect(PageClassifier.classify('http://example.com/buy-now')).toBe(PageType.PRICING);
    expect(PageClassifier.classify('http://example.com/subscribe')).toBe(PageType.PRICING);
  });

  it('should classify blog page', () => {
    expect(PageClassifier.classify('http://example.com/blog')).toBe(PageType.BLOG);
    expect(PageClassifier.classify('http://example.com/news')).toBe(PageType.BLOG);
    expect(PageClassifier.classify('http://example.com/articles/some-article')).toBe(PageType.BLOG);
    expect(PageClassifier.classify('http://example.com/posts/123')).toBe(PageType.BLOG);
    expect(PageClassifier.classify('http://example.com/post/123')).toBe(PageType.BLOG);
  });

  it('should classify about page', () => {
    expect(PageClassifier.classify('http://example.com/about-us')).toBe(PageType.ABOUT);
    expect(PageClassifier.classify('http://example.com/about')).toBe(PageType.ABOUT);
    expect(PageClassifier.classify('http://example.com/company')).toBe(PageType.ABOUT);
    expect(PageClassifier.classify('http://example.com/our-story')).toBe(PageType.ABOUT);
  });

  it('should classify contact page', () => {
    expect(PageClassifier.classify('http://example.com/contact')).toBe(PageType.CONTACT);
    expect(PageClassifier.classify('http://example.com/contact-us')).toBe(PageType.CONTACT);
    expect(PageClassifier.classify('http://example.com/support')).toBe(PageType.CONTACT);
    expect(PageClassifier.classify('http://example.com/help')).toBe(PageType.CONTACT);
  });

  it('should classify product page', () => {
    expect(PageClassifier.classify('http://example.com/products/widget')).toBe(PageType.PRODUCT);
    expect(PageClassifier.classify('http://example.com/product/a')).toBe(PageType.PRODUCT);
    expect(PageClassifier.classify('http://example.com/services/b')).toBe(PageType.PRODUCT);
    expect(PageClassifier.classify('http://example.com/store/item-123')).toBe(PageType.PRODUCT);
    expect(PageClassifier.classify('http://example.com/shop/category/item')).toBe(PageType.PRODUCT);
  });

  it('should classify other pages', () => {
    expect(PageClassifier.classify('http://example.com/some/other/page')).toBe(PageType.OTHER);
  });

  it('should be case-insensitive', () => {
    expect(PageClassifier.classify('http://example.com/PRICING')).toBe(PageType.PRICING);
  });
}); 