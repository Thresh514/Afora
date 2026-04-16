"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Search, Upload, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDropzone } from "react-dropzone";
import { Image as ImageIcon } from "lucide-react";
import { searchPexelsImages, setBgImage } from "@/actions/actions";
import { toast } from "sonner";
import { Skeleton } from "./ui/skeleton";
import { Loader } from "lucide-react";
import { storage } from "@/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import NextImage from "next/image";

export default function ImageSearchDialog({ orgId }: { orgId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string | null>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>("");
  const [, setIsDragging] = useState(false);
  const [searchRes, setSearchRes] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [thumbnailCache, setThumbnailCache] = useState<Record<string, string>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Create a thumbnail version of the image URL for faster loading
  const generateThumbnailUrl = useCallback(
    (originalUrl: string) => {
      // Check if we already have a cached thumbnail
      if (thumbnailCache[originalUrl]) {
        return thumbnailCache[originalUrl];
      }

      // For Pexels URLs, we can modify the URL to request a medium size (better quality than tiny thumbnails)
      if (originalUrl.includes("pexels.com")) {
        let thumbnailUrl = originalUrl;

        // If URL already has query parameters
        if (thumbnailUrl.includes("?")) {
          // Remove existing width/height/dpr params if they exist
          thumbnailUrl = thumbnailUrl.replace(/[&?](w|h|dpr)=[^&]+/g, "");
          // Add our medium resolution parameters 300x300
          thumbnailUrl += "&w=300&h=300&dpr=2&q=80";
        } else {
          // Add query parameters for the first time
          thumbnailUrl += "?auto=compress&cs=tinysrgb&w=300&h=300&dpr=2&q=80";
        }

        // Cache the thumbnail URL
        setThumbnailCache((prev) => ({
          ...prev,
          [originalUrl]: thumbnailUrl,
        }));
        return thumbnailUrl;
      }

      // For other URLs where we can't modify, return the original
      return originalUrl;
    },
    [thumbnailCache]
  );

  // Generate higher quality preview for the selected image
  const generateHighQualityUrl = useCallback((originalUrl: string) => {
    if (originalUrl.includes("pexels.com")) {
      let highQualityUrl = originalUrl;

      if (highQualityUrl.includes("?")) {
        highQualityUrl = highQualityUrl.replace(/[&?](w|h|dpr|q)=[^&]+/g, "");
        // Higher quality but still optimized
        highQualityUrl += "&w=800&h=800&dpr=2&q=90";
      } else {
        highQualityUrl += "?auto=compress&cs=tinysrgb&w=800&h=800&dpr=2&q=90";
      }

      return highQualityUrl;
    }

    return originalUrl;
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);

    // Create preview URL for the image
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    // Reset the loaded state for this new image
    setLoadedImages({});
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxFiles: 1,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  });

  const searchImages = async () => {
    if (!searchQuery) return;
    setIsLoading(true);
    setSearchRes([]);
    setLoadedImages({});

    try {
      const response = await searchPexelsImages(searchQuery);
      if (response.success && response.urls) {
        setSearchRes(response.urls);

        // Pre-generate all thumbnails URLs for cache
        response.urls.slice(0, 9).forEach((url: string) => {
          generateThumbnailUrl(url);
        });
      } else {
        throw Error("Image Search Failed!");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to search images. Please try again.");
    }

    setIsLoading(false);
  };

  const handleImageLoad = useCallback((url: string) => {
    setLoadedImages((prev) => ({ ...prev, [url]: true }));
  }, []);

  const handleImageSelect = async (imageUrl: string) => {
    setIsSelecting(true);
    try {
      // Use the high quality version for the preview
      const highQualityUrl = generateHighQualityUrl(imageUrl);

      // Fetch the image and convert it to a file
      const response = await fetch(highQualityUrl);
      const blob = await response.blob();
      const filename = imageUrl.split("/").pop() || "image.jpg";
      const file = new File([blob], filename, { type: blob.type });

      setUploadedFile(file);
      setImagePreview(highQualityUrl);
      setLoadedImages((prev) => ({ ...prev, [highQualityUrl]: true }));
    } catch (error) {
      console.error("Error selecting image:", error);
      toast.error("Failed to select the image. Please try again.");
    } finally {
      setIsSelecting(false);
    }
  };

  // Setup intersection observer for lazy loading images
  useEffect(() => {
    // Initialize the intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const imgElement = entry.target as HTMLImageElement;
            const urlToLoad = imgElement.dataset.fullUrl;
            if (urlToLoad) {
              imgElement.src = generateThumbnailUrl(urlToLoad);
              imgElement.removeAttribute("data-full-url");
              observerRef.current?.unobserve(imgElement);
            }
          }
        });
      },
      { rootMargin: "100px" } // Start loading when within 100px of viewport
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [generateThumbnailUrl]);

  // Connect observer to images after render
  useEffect(() => {
    if (!searchRes.length || !observerRef.current) return;

    setTimeout(() => {
      const imgElements = document.querySelectorAll("img[data-full-url]");
      imgElements.forEach((img) => {
        if (observerRef.current) {
          observerRef.current.observe(img);
        }
      });
    }, 0);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [searchRes, isLoading]);

  // Clean up function to handle memory leaks
  useEffect(() => {
    return () => {
      // Clean up any blob URLs when component unmounts
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }

      // Clean up any cached thumbnails
      Object.values(thumbnailCache).forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [imagePreview, thumbnailCache]);

  // Memoize these handlers to prevent unnecessary re-renders
  const handleConfirm = useCallback(async () => {
    if (uploadedFile) {
      if (uploadedFile.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast.error("Image size exceeds the 10MB limit. Please choose a smaller image.");
        return;
      }
      try {
        const filename = `${Date.now()}-${uploadedFile.name}`;
        const storageRef = ref(storage, `backgroundImages/${filename}`);
        await uploadBytes(storageRef, uploadedFile);
        const downloadURL = await getDownloadURL(storageRef);
        await setBgImage(orgId, downloadURL);
        toast.success("Image uploaded and background image changed successfully!");
      } catch (error) {
        if (error instanceof Error) {
          toast.error(`Failed to upload image: ${error.message}`);
        } else {
          toast.error("Failed to upload image due to an unknown error.");
        }
        console.error("Upload error:", error);
      }
    } else if (imagePreview) {
      try {
        await setBgImage(orgId, imagePreview);
        toast.success("Background image changed successfully!");
      } catch (error) {
        console.error("Error setting background image:", error);
        toast.error("Failed to set the background image. Please try again.");
      }
    }
    setUploadedFile(null);
    setImagePreview(null);
    setIsOpen(false);
  }, [uploadedFile, imagePreview, orgId]);

  const handleCancel = useCallback(() => {
    setUploadedFile(null);
    setImagePreview(null);

    // Revoke the object URL to avoid memory leaks
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
  }, [imagePreview]);

  const handleClose = useCallback(() => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    // Reset all state variables
    setUploadedFile(null);
    setImagePreview("");
    setSearchQuery("");
    setIsLoading(false);
    setIsDragging(false);
    setIsOpen(false);
    setLoadedImages({});
  }, [imagePreview]);

  return (
    <>
      <button
        className="bg-white bg-opacity-50 p-2 rounded-md flex items-center justify-center overflow-hidden transition-all duration-300 ease-in-out hover:w-36 w-10 group"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex items-center w-full">
          <ImageIcon size={20} className="flex-shrink-0" />
          <span className="ml-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Change Image
          </span>
        </div>
      </button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleClose();
          } else {
            setIsOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]" {...getRootProps()}>
          <input {...getInputProps()} />
          {uploadedFile ? (
            <div className="text-center">
              <div className="mb-4">
                {imagePreview && (
                  <div className="relative w-full max-h-48 overflow-hidden rounded-md mb-4">
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                      {!loadedImages[imagePreview] && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="animate-pulse bg-gray-200 w-full h-full"></div>
                        </div>
                      )}
                      {isLoading ? (
                        <Loader className="w-10 h-10 text-gray-500" />
                      ) : (
                        <NextImage
                          src={imagePreview}
                          alt="Preview"
                          width={400}
                          height={192}
                          className={`mx-auto object-contain max-h-48 w-full transition-opacity duration-300 ${loadedImages[imagePreview] ? "opacity-100" : "opacity-0"}`}
                          onLoad={() => handleImageLoad(imagePreview)}
                        />
                      )}
                    </div>
                  </div>
                )}
                <Check className="w-10 h-10 text-green-500 mx-auto mb-2" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Image Selected</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {uploadedFile.name.startsWith("blob:")
                  ? "Selected from search results"
                  : uploadedFile.name}
              </p>
              <div className="flex justify-center space-x-4">
                <Button onClick={handleConfirm}>Confirm</Button>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={`transition-all duration-300 ${isDragActive ? "bg-primary/10 border-primary" : ""}`}
            >
              <DialogHeader>
                <DialogTitle className="flex justify-between items-center">
                  <span>Search Images</span>
                  <a href="https://www.pexels.com" className="mr-4">
                    <NextImage
                      src="https://images.pexels.com/lib/api/pexels.png"
                      alt="Pexels"
                      width={64}
                      height={24}
                      className="inline-block h-6"
                    />
                  </a>
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center space-x-2 my-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={searchImages}
                  disabled={isLoading || isSelecting}
                >
                  <Search className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Search images..."
                  className="flex-grow"
                  value={searchQuery || ""}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") searchImages();
                  }}
                  disabled={isLoading || isSelecting}
                />
              </div>

              {isSelecting && (
                <div className="absolute inset-0 z-50 bg-background/80 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}

              {/* Progressive loading grid layout */}
              <div className="grid grid-cols-3 gap-3 mb-4 relative mx-auto justify-items-center">
                {isLoading
                  ? [...Array(9)].map((_, i) => (
                      <div key={i} className="h-24 w-24 flex items-center justify-center">
                        <Skeleton className="rounded-md h-full w-full" />
                      </div>
                    ))
                  : searchRes.length === 0
                    ? [...Array(9)].map((_, i) => (
                        <div key={i} className="h-24 w-24 flex items-center justify-center">
                          <div className="rounded-md h-full w-full bg-gray-100"></div>
                        </div>
                      ))
                    : // Limited to 9 search results with improved progressive loading
                      searchRes.slice(0, 9).map((url, i) => {
                        return (
                          <div
                            key={i}
                            className="bg-muted rounded-md overflow-hidden cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-200 transform hover:scale-105 h-24 w-24 flex items-center justify-center relative"
                            onClick={() => handleImageSelect(url)}
                          >
                            {/* Placeholder/skeleton while loading */}
                            {!loadedImages[url] && (
                              <div className="absolute inset-0 animate-pulse bg-gray-200 rounded-md"></div>
                            )}
                            {/* Higher quality thumbnails */}
                            <NextImage
                              src={generateThumbnailUrl(url)}
                              alt={`Search result ${i + 1}`}
                              width={96}
                              height={96}
                              className="object-cover w-full h-full transition-opacity duration-300"
                              style={{
                                opacity: loadedImages[url] ? 1 : 0,
                              }}
                              onLoad={() => handleImageLoad(url)}
                            />
                          </div>
                        );
                      })}
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  open();
                }}
                disabled={isLoading || isSelecting}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </Button>
              {isDragActive && (
                <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                  <p className="text-lg font-semibold">Drop your image here</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
