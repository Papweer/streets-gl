import System from "../System";
import MapWorkerSystem from "./MapWorkerSystem";
import Tile3DBuffers from "~/lib/tile-processing/tile3d/buffers/Tile3DBuffers";
import Config from "~/app/Config";
import MapWorker from "~/app/world/worker/MapWorker";
import TileSystem from "~/app/systems/TileSystem";
import Vec2 from "~/lib/math/Vec2";

export default class TileLoadingSystem extends System {

	public postInit(): void {

	}

	public async fetchTilesTimestamp(): Promise<Date> {
		const url = `${Config.TileServerEndpoint}/vector.timestamp`;
		let timestamp: Date = null;

		try {
			const response = await fetch(url);

			if (response.status === 200) {
				const text = await response.text();
				timestamp = new Date(text.replace(/\n/g, ''));
			} else {
				console.error(`Failed to fetch vector tiles timestamp. Status: ${response.status}`);
			}
		} catch (e) {
			console.error(e);
		}

		return timestamp;
	}

	public update(deltaTime: number): void {
		const mapWorkerSystem = this.systemManager.getSystem(MapWorkerSystem);
		const tileSystem = this.systemManager.getSystem(TileSystem);

		const queuedTile = tileSystem.getNextTileToLoad();
		const worker = mapWorkerSystem.getFreeWorker();

		if (queuedTile && worker) {
			this.loadTile({
				tile: queuedTile.position,
				onBeforeLoad: queuedTile.onBeforeLoad,
				onLoad: queuedTile.onLoad,
				worker: worker,
				isTerrainHeightEnabled: tileSystem.enableTerrainHeight
			});
		}
	}

	private async loadTile(
		{
			tile,
			onBeforeLoad,
			onLoad,
			worker,
			isTerrainHeightEnabled
		}: {
			tile: Vec2;
			onBeforeLoad: () => Promise<any>;
			onLoad: (buffers: Tile3DBuffers) => void;
			worker: MapWorker;
			isTerrainHeightEnabled: boolean;
		}
	): Promise<void> {
		await onBeforeLoad();

		worker.requestTile(tile.x, tile.y, {
			tileServerEndpoint: Config.TileServerEndpoint,
			vectorTilesEndpointTemplate: Config.TilesEndpointTemplate,
			isTerrainHeightEnabled: isTerrainHeightEnabled
		}).then(result => {
			onLoad(result);
		}, error => {
			//console.error(`Failed to load tile ${tile.x},${tile.y}. Retrying...`, error);
			onLoad(null);
		});
	}
}
