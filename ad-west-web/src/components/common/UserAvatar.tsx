import React from 'react';
import { resolveAvatarGender, type AvatarGender } from '../../utils/userAvatar';

const DEFAULT_AVATARS: Record<AvatarGender, string> = {
  male: '/male.jpg',
  female: '/female.jpg',
};

interface UserAvatarProps {
  picture?: string | null;
  gender?: string | null;
  name?: string | null;
  className?: string;
  alt?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  picture,
  gender,
  name,
  className = '',
  alt = '',
}) => {
  const avatarGender = resolveAvatarGender(gender, name);
  const src = picture || DEFAULT_AVATARS[avatarGender];

  return <img src={src} alt={alt} className={className} />;
};
