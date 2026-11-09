import React from 'react';
import { Composition } from 'remotion';
import { DynamicVideo } from './DynamicVideo';
import meta from './meta.json';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DynamicVideo"
        component={DynamicVideo}
        durationInFrames={meta.durationInFrames || 150}
        fps={meta.fps || 30}
        width={meta.width || 1920}
        height={meta.height || 1080}
      />
    </>
  );
};
