import {describe,it,expect} from 'vitest';
import {managedImageKey,rasterImageType,validLegacyAvatar} from '../src/server/images';
import {validateImageFile} from '../src/app/services/imageService';

const png=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
describe('protected image validation',()=>{
  it('identifies raster content and rejects SVG/scripts',()=>{
    expect(rasterImageType(png)).toBe('image/png');
    expect(rasterImageType(new TextEncoder().encode('<svg onload="alert(1)"/>'))).toBeNull();
    expect(rasterImageType(new Uint8Array(0))).toBeNull();
  });
  it('accepts only bounded raster legacy avatars',()=>{
    expect(validLegacyAvatar('data:image/png;base64,'+btoa(String.fromCharCode(...png)))).toBe(true);
    expect(validLegacyAvatar('data:image/svg+xml;base64,PHN2Zy8+')).toBe(false);
    expect(validLegacyAvatar('data:image/png;base64,'+'a'.repeat(500_000))).toBe(false);
    expect(validLegacyAvatar('data:image/png;base64,ZmFrZQ==')).toBe(false);
  });
  it('restricts persisted references to managed local paths',()=>{
    const path='/api/images?key='+encodeURIComponent('profile/user-id/12345678-1234-1234-1234-123456789abc.png');
    expect(managedImageKey(path)).toBe('profile/user-id/12345678-1234-1234-1234-123456789abc.png');
    expect(managedImageKey('https://other.example'+path)).toBeNull();
    expect(managedImageKey('/api/images?key=../../secret')).toBeNull();
  });
  it('rejects invalid or oversized file selections before upload',()=>{
    expect(()=>validateImageFile(new File(['x'],'image.svg',{type:'image/svg+xml'}))).toThrow();
    expect(()=>validateImageFile(new File([new Uint8Array(10*1024*1024+1)],'image.png',{type:'image/png'}))).toThrow();
    expect(()=>validateImageFile(new File([png],'image.png',{type:'image/png'}))).not.toThrow();
  });
});
