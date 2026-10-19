import React from 'react';
import {Composition} from 'remotion';
import {Doc} from './Doc';
import type {DocProps} from './types';
import {FPS, H, W} from './theme';
import sample from '../props.sample.json';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Doc"
    component={Doc as any}
    width={W}
    height={H}
    fps={FPS}
    durationInFrames={300}
    defaultProps={sample as unknown as DocProps}
    calculateMetadata={({props}) => ({durationInFrames: Math.max(30, (props as unknown as DocProps).timeline?.total ?? 300)})}
  />
);
