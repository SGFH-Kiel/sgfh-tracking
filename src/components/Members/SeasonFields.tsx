import React, { useState } from 'react';
import {
  Chip,
  FormControl,
  FormHelperText,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Select,
  SxProps,
  Theme,
  Tooltip,
} from '@mui/material';
import { Check as CheckIcon, SwapHoriz as SwapHorizIcon, WarningAmber as WarningAmberIcon } from '@mui/icons-material';
import humanizeDuration from 'humanize-duration';
import { formatSeason } from '../../domain/seasons';

const humanizer = humanizeDuration.humanizer({ language: 'de', round: true, units: ['h', 'm'], delimiter: ' und ' });

export const SEASON_MANUAL_HINT = 'Das Mitglied hat bewusst eine andere als die vorgeschlagene Saison gewählt.';

interface SeasonChipProps {
  season: number;
  manual?: boolean;
  /** Öffnet ein Menü zum Ändern der Saison, wenn Optionen übergeben werden. */
  options?: number[];
  onChange?: (season: number) => void;
  disabled?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Zeigt die Saison eines Eintrags. Abweichend gewählte Saisons werden farblich hervorgehoben,
 * damit sie beim Bestätigen sofort auffallen.
 */
export const SeasonChip: React.FC<SeasonChipProps> = ({ season, manual, options, onChange, disabled, sx }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const editable = !!onChange && !!options && options.length > 1 && !disabled;
  const label = manual ? `${formatSeason(season)} · abweichend` : formatSeason(season);
  const tooltip = [manual ? SEASON_MANUAL_HINT : null, editable ? 'Klicken, um die Saison zu ändern.' : null].filter(Boolean).join(' ');

  const chip = (
    <Chip
      size="small"
      label={label}
      color={manual ? 'warning' : 'default'}
      variant={manual ? 'filled' : 'outlined'}
      icon={manual ? <WarningAmberIcon /> : editable ? <SwapHorizIcon /> : undefined}
      onClick={editable ? (event) => { event.stopPropagation(); setAnchorEl(event.currentTarget); } : undefined}
      sx={{ fontWeight: manual ? 'bold' : undefined, ...sx }}
    />
  );

  return (
    <>
      {tooltip ? <Tooltip title={tooltip}>{chip}</Tooltip> : chip}
      {editable && (
        <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)} onClick={(event) => event.stopPropagation()}>
          {options!.map((option) => (
            <MenuItem
              key={option}
              selected={option === season}
              onClick={() => {
                setAnchorEl(null);
                if (option !== season) onChange!(option);
              }}
            >
              <ListItemIcon>{option === season ? <CheckIcon fontSize="small" /> : null}</ListItemIcon>
              <ListItemText>{formatSeason(option)}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
};

interface SeasonSelectProps {
  value: number;
  onChange: (season: number) => void;
  options: number[];
  defaultSeason: number;
  currentSeason: number;
  /** Noch offene Minuten der aktuellen Saison; steuert den Hinweistext. */
  missingCurrentMinutes?: number;
  disabled?: boolean;
  size?: 'small' | 'medium';
  label?: string;
  /** Hinweistext für Dritte (Admin trägt jemanden ein) statt Ansprache des Mitglieds. */
  forOtherMember?: boolean;
  sx?: SxProps<Theme>;
}

export const SeasonSelect: React.FC<SeasonSelectProps> = ({
  value,
  onChange,
  options,
  defaultSeason,
  currentSeason,
  missingCurrentMinutes = 0,
  disabled,
  size = 'medium',
  label = 'Zählt für Saison',
  forOtherMember,
  sx,
}) => {
  const isDefault = value === defaultSeason;
  let helper: string;
  if (!isDefault) {
    helper = `Abweichend vom Vorschlag (${formatSeason(defaultSeason)}). Das wird bei der Bestätigung angezeigt.`;
  } else if (defaultSeason === currentSeason && missingCurrentMinutes > 0) {
    helper = forOtherMember
      ? `Für ${formatSeason(currentSeason)} fehlen noch ${humanizer(missingCurrentMinutes * 60000)} – deshalb zählt der Eintrag standardmäßig für ${currentSeason}.`
      : `Ihnen fehlen für ${formatSeason(currentSeason)} noch ${humanizer(missingCurrentMinutes * 60000)}. Damit Sie weiter segeln können, zählt der Eintrag standardmäßig für ${currentSeason}.`;
  } else if (defaultSeason > currentSeason) {
    helper = forOtherMember
      ? `${formatSeason(currentSeason)} ist bereits abgedeckt – der Eintrag zählt standardmäßig für ${defaultSeason}.`
      : `Ihre Stunden für ${formatSeason(currentSeason)} sind abgedeckt – der Eintrag zählt standardmäßig für ${defaultSeason}.`;
  } else {
    helper = `Vorschlag: ${formatSeason(defaultSeason)}`;
  }

  return (
    <FormControl fullWidth size={size} disabled={disabled} sx={sx}>
      <InputLabel id="season-select-label">{label}</InputLabel>
      <Select
        labelId="season-select-label"
        label={label}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            {formatSeason(option)}
            {option === currentSeason ? ' (aktuelle Saison)' : option > currentSeason ? ' (nächste Saison)' : ''}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText sx={{ color: isDefault ? undefined : 'warning.main' }}>{helper}</FormHelperText>
    </FormControl>
  );
};
