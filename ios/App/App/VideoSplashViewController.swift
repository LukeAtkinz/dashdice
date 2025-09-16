import UIKit
import AVFoundation

class VideoSplashViewController: UIViewController {
    
    private var player: AVPlayer?
    private var playerLayer: AVPlayerLayer?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupVideoPlayer()
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        playVideo()
    }
    
    private func setupVideoPlayer() {
        // Set background color
        view.backgroundColor = UIColor(red: 0.1, green: 0.1, blue: 0.18, alpha: 1.0) // #1a1a2e
        
        guard let videoPath = Bundle.main.path(forResource: "splash_video", ofType: "mp4") else {
            // If video not found, proceed to main app
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                self.proceedToMainApp()
            }
            return
        }
        
        let videoURL = URL(fileURLWithPath: videoPath)
        player = AVPlayer(url: videoURL)
        
        playerLayer = AVPlayerLayer(player: player)
        playerLayer?.frame = view.bounds
        playerLayer?.videoGravity = .resizeAspectFill
        
        if let playerLayer = playerLayer {
            view.layer.addSublayer(playerLayer)
        }
        
        // Add observer for when video finishes
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(videoDidFinish),
            name: .AVPlayerItemDidPlayToEndTime,
            object: player?.currentItem
        )
    }
    
    private func playVideo() {
        player?.seek(to: .zero)
        player?.play()
    }
    
    @objc private func videoDidFinish() {
        proceedToMainApp()
    }
    
    private func proceedToMainApp() {
        // Transition to main storyboard
        DispatchQueue.main.async {
            let storyboard = UIStoryboard(name: "Main", bundle: nil)
            if let mainViewController = storyboard.instantiateInitialViewController() {
                mainViewController.modalPresentationStyle = .fullScreen
                self.present(mainViewController, animated: true) {
                    // Remove this splash controller from memory
                    self.view.removeFromSuperview()
                }
            }
        }
    }
    
    override func viewWillLayoutSubviews() {
        super.viewWillLayoutSubviews()
        playerLayer?.frame = view.bounds
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
        player?.pause()
        playerLayer?.removeFromSuperlayer()
    }
}
