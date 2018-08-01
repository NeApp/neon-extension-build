import {getUniqueOrigins, isOriginMatch} from './module';


describe('core/module', () => {
    describe('getUniqueOrigins', () => {
        it('should remove duplicate origins', () => {
            expect(getUniqueOrigins([
                '*://www.amazon.com/*',
                '*://www.amazon.com/*'
            ])).toEqual([
                '*://www.amazon.com/*'
            ]);
        });

        it('should remove matching origins', () => {
            expect(getUniqueOrigins([
                '*://amazon.com/*',
                '*://www.amazon.com/*',
                '*://www.amazon.com/b?*',
                '*://www.amazon.com/gp/video/storefront',
                '*://www.amazon.com/gp/video/storefront/*'
            ])).toEqual([
                '*://amazon.com/*',
                '*://www.amazon.com/*'
            ]);
        });
    });

    describe('isOriginMatch', () => {
        it('should match same origin', () => {
            expect(isOriginMatch(
                '*://www.amazon.com/*',
                '*://www.amazon.com/*'
            )).toBeTruthy();
        });

        it('should match path', () => {
            expect(isOriginMatch(
                '*://www.amazon.com/*',
                '*://www.amazon.com/gp/video/storefront'
            )).toBeTruthy();
        });

        it('should match path with wildcards', () => {
            expect(isOriginMatch(
                '*://www.amazon.com/*',
                '*://www.amazon.com/gp/video/storefront/*'
            )).toBeTruthy();
        });
    });
});
