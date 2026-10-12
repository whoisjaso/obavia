/* A photo on the Lane. Upright shots fill the screen. Sideways shots (people
   shoot cars horizontally) are never cropped into a sliver: the same photo,
   blurred and enlarged, fills the glass behind, and the sharp frame sits at
   width, a little above centre so the price has room beneath it. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { isWide, type Photo } from '../data/cars';
import { theme } from '../theme';

export function LanePhoto({ photo, width, height, transition = 180 }: { photo: Photo; width: number; height: number; transition?: number }) {
  if (!isWide(photo)) {
    return <Image source={photo.src} style={StyleSheet.absoluteFill} contentFit="cover" transition={transition} />;
  }
  const h = Math.round(width * photo.h / photo.w);
  const top = Math.round(height * 0.42 - h / 2);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.ink }]}>
      <Image source={photo.src} style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.25 }] }]} contentFit="cover" blurRadius={28} transition={transition} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,14,30,0.28)' }]} />
      <Image source={photo.src} style={{ position: 'absolute', left: 0, top, width, height: h }} contentFit="cover" transition={transition} />
    </View>
  );
}
