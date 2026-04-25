import { Globe, Mail, MapPin, UserRound } from 'lucide-react';

function splitSkills(skills = '') {
  return skills
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default function FreelancerProfileCard({ freelancerId, profile, fallbackEmail }) {
  const displayEmail = profile?.email || fallbackEmail || `Freelance #${freelancerId}`;
  const displayName = displayEmail.includes('@') ? displayEmail.split('@')[0] : displayEmail;
  const skills = splitSkills(profile?.skills);
  const isProfileDetailed = Boolean(profile?.bio || profile?.portfolioUrl || skills.length > 0);

  return (
    <section className="profile-card public-profile-card animate-fade-in-up">
      <div className="profile-header">
        <div className="profile-avatar">{displayName.charAt(0).toUpperCase()}</div>
        <div className="profile-info">
          <h1>{displayName}</h1>
          <p className="public-profile-email">
            <Mail size={14} /> {displayEmail}
          </p>
        </div>
      </div>

      <div className="public-profile-meta">
        {isProfileDetailed && (
          <div className="public-meta-item">
            <UserRound size={16} />
            <span>Profil public renseigne</span>
          </div>
        )}
        {profile?.city && (
          <div className="public-meta-item">
            <MapPin size={16} />
            <span>Ville visible : {profile.city}</span>
          </div>
        )}
        {profile?.portfolioUrl && (
          <div className="public-meta-item">
            <Globe size={16} />
            <span>Portfolio public disponible</span>
          </div>
        )}
      </div>

      <p className="public-profile-bio">
        {profile?.bio ||
          'Ce freelance n a pas encore complete sa presentation publique, mais ses services sont deja visibles.'}
      </p>

      {skills.length > 0 && (
        <div className="public-skill-list">
          {skills.map((skill) => (
            <span key={skill} className="badge badge-primary">
              {skill}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
