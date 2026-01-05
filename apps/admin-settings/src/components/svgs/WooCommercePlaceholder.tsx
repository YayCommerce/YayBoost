import { cn } from '@/lib/utils';

const WooCommercePlaceholder = ({ className = '', ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 290 290"
    className={cn(className)}
    {...props}
  >
    <rect fill="#f5f8f7" x="0" y=".3" width="290" height="290" />
    <g>
      <rect
        fill="#f5f8f7"
        stroke="#a7aaa9"
        strokeMiterlimit={10}
        x="75"
        y="74.6"
        width="140"
        height="140"
      />
      <g>
        <rect
          fill="#fff"
          stroke="#a7aaa9"
          strokeMiterlimit={10}
          x="93.1"
          y="92.6"
          width="103.9"
          height="104"
        />
        <path
          fill="none"
          stroke="#a7aaa9"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M93.1,151l23.4-29.3,50.6,60.5s15.4-4.5,14.5-14.4c-.6-6.4-7.5-6.3-8.2-13.6-.4-5.2,1-8,1-8l22.3,18.4"
        />
        <path
          fill="#f6f9f8"
          stroke="#a7aaa9"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M116.6,121.7l3,21.9s-6.3,9.7-6.5,12.2,31.2,33.2,31.2,33.2c0,0-22.9-23.4-51-23.7v-14.9s23.4-28.8,23.4-28.8"
        />
        <path
          fill="#f6f9f8"
          stroke="#a7aaa9"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M152.6,164.2l21.9-18s-3.1,7.9,1,13.2c2.2,2.6,6.5,4.3,6,10s-7.8,10.9-14.4,12.8c-2.6-3.3-14.6-18-14.6-18Z"
        />
        <ellipse
          fill="none"
          stroke="#a7aaa9"
          strokeLinecap="round"
          strokeLinejoin="round"
          cx="156.8"
          cy="121.9"
          rx="14.3"
          ry="14.3"
        />
      </g>
    </g>
  </svg>
);

export default WooCommercePlaceholder;
