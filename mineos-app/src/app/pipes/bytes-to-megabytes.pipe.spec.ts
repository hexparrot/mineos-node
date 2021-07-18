import { BytesToMegabytesPipe } from './bytes-to-megabytes.pipe';

describe('BytesToMegabytesPipe', () => {
  it('create an instance', () => {
    const pipe = new BytesToMegabytesPipe();
    expect(pipe).toBeTruthy();
  });

  it('should convert bytes to kilobytes', () => {
    const pipe = new BytesToMegabytesPipe();
    expect(pipe.transform(512000)).toBe('500KB');
  });

  it('should convert bytes to Megabytes', () => {
    const pipe = new BytesToMegabytesPipe();
    expect(pipe.transform(524288000)).toBe('500MB');
  });

  it('should handle null bytes to Megabytes', () => {
    const pipe = new BytesToMegabytesPipe();
    expect(pipe.transform(null)).toBe(null);
  });
  it('should not convert value less than 1 Megabyte', () => {
    const pipe = new BytesToMegabytesPipe();
    expect(pipe.transform(756)).toBe("756B");
  });
});
