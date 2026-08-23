import Image from 'next/image';
import styles from './GasBrand.module.css';

type GasBrandVariant = 'compact' | 'rail' | 'hero' | 'mark';

type GasBrandProps = {
  variant?: GasBrandVariant;
  sublabel?: string;
};

export function GasBrand({ variant = 'compact', sublabel }: GasBrandProps) {
  const markOnly = variant === 'mark';

  return (
    <span className={`${styles.brand} ${styles[variant]}`} data-gas-brand={variant}>
      <span className={styles.markFrame}>
        <Image
          className={styles.markImage}
          src="/logo/gascoin-g.jpg"
          alt={markOnly ? 'GAS' : ''}
          width={800}
          height={800}
          priority={variant === 'compact' || variant === 'rail'}
          sizes={variant === 'hero' ? '64px' : variant === 'rail' ? '48px' : '36px'}
        />
      </span>
      {!markOnly ? (
        <span className={styles.lockup}>
          <span className={styles.word}>GAS</span>
          {sublabel ? <span className={styles.sublabel} aria-hidden="true">{sublabel}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
