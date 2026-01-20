import React, {useContext} from "react";
import styles from "./Setting.scss";
import {AtomsContext} from "~/app/ui/UI";
import {useAtom, useAtomValue} from "jotai";
import Setting from "./Setting";

const SettingSelect: React.FC<{
	id: string;
}> = ({id}) => {
	const atoms = useContext(AtomsContext);
	const [settingValue, setSettingValue] = useAtom(atoms.settingsObject(id));
	const schema = useAtomValue(atoms.settingsSchema)[id];
	const selected = settingValue.statusValue;

	return <Setting name={schema.label} isSub={!!schema.parent}>
		<div className={styles.selectButtons}>
			{schema.status.map((status, i) => {
				const statusLabel = schema.statusLabels[i];
				let classNames = styles.selectButtons__button;

				if (selected === status) {
					classNames += ' ' + styles['selectButtons__button--disabled'];
				}

				return <button
					className={classNames}
					key={status}
					onClick={(): void => {
						if (selected !== status) {
							setSettingValue({...settingValue, statusValue: status});
						}
					}}
				>{statusLabel}</button>
			})}
		</div>
	</Setting>
}

export default React.memo(SettingSelect);